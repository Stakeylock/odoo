const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { supabase } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

// Get all questions with pagination and filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('tag').optional().isString(),
  query('search').optional().isString(),
  query('sort').optional().isIn(['newest', 'oldest', 'votes', 'answers'])
], optionalAuth, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { tag, search, sort = 'newest' } = req.query;

    let query = supabase
      .from('questions')
      .select(`
        *,
        users!questions_user_id_fkey(id, username, full_name),
        question_tags!inner(tags(id, name)),
        answers(id),
        question_votes(vote_type)
      `);

    // Apply filters
    if (tag) {
      query = query.eq('question_tags.tags.name', tag);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'votes':
        query = query.order('vote_score', { ascending: false });
        break;
      case 'answers':
        query = query.order('answer_count', { ascending: false });
        break;
      default: // newest
        query = query.order('created_at', { ascending: false });
    }

    const { data: questions, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Process questions data
    const processedQuestions = questions.map(question => ({
      ...question,
      tags: question.question_tags.map(qt => qt.tags),
      answer_count: question.answers.length,
      vote_score: question.question_votes.reduce((sum, vote) => {
        return sum + (vote.vote_type === 'upvote' ? 1 : -1);
      }, 0),
      user_vote: req.user ? question.question_votes.find(v => v.user_id === req.user.id)?.vote_type : null
    }));

    res.json({
      questions: processedQuestions,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single question with answers
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: question, error } = await supabase
      .from('questions')
      .select(`
        *,
        users!questions_user_id_fkey(id, username, full_name, avatar_url),
        question_tags(tags(id, name)),
        answers(
          *,
          users!answers_user_id_fkey(id, username, full_name, avatar_url),
          answer_votes(vote_type, user_id)
        ),
        question_votes(vote_type, user_id)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Question not found' });
      }
      throw error;
    }

    // Process question data
    const processedQuestion = {
      ...question,
      tags: question.question_tags.map(qt => qt.tags),
      vote_score: question.question_votes.reduce((sum, vote) => {
        return sum + (vote.vote_type === 'upvote' ? 1 : -1);
      }, 0),
      user_vote: req.user ? question.question_votes.find(v => v.user_id === req.user.id)?.vote_type : null,
      answers: question.answers.map(answer => ({
        ...answer,
        vote_score: answer.answer_votes.reduce((sum, vote) => {
          return sum + (vote.vote_type === 'upvote' ? 1 : -1);
        }, 0),
        user_vote: req.user ? answer.answer_votes.find(v => v.user_id === req.user.id)?.vote_type : null
      })).sort((a, b) => {
        // Accepted answer first, then by vote score
        if (a.is_accepted && !b.is_accepted) return -1;
        if (!a.is_accepted && b.is_accepted) return 1;
        return b.vote_score - a.vote_score;
      })
    };

    // Increment view count
    await supabase
      .from('questions')
      .update({ view_count: question.view_count + 1 })
      .eq('id', id);

    res.json({ question: processedQuestion });
  } catch (error) {
    next(error);
  }
});

// Create new question
router.post('/', [
  body('title').isLength({ min: 5, max: 200 }),
  body('description').isLength({ min: 10 }),
  body('tags').isArray({ min: 1, max: 5 })
], authenticateToken, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, tags } = req.body;

    // Create question
    const { data: question, error } = await supabase
      .from('questions')
      .insert({
        title,
        description,
        user_id: req.user.id
      })
      .select('*')
      .single();

    if (error) throw error;

    // Add tags
    for (const tagName of tags) {
      // Get or create tag
      let { data: tag, error: tagError } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName.toLowerCase())
        .single();

      if (tagError && tagError.code === 'PGRST116') {
        // Tag doesn't exist, create it
        const { data: newTag, error: createError } = await supabase
          .from('tags')
          .insert({ name: tagName.toLowerCase() })
          .select('id')
          .single();
        
        if (createError) throw createError;
        tag = newTag;
      } else if (tagError) {
        throw tagError;
      }

      // Link tag to question
      const { error: linkError } = await supabase
        .from('question_tags')
        .insert({
          question_id: question.id,
          tag_id: tag.id
        });

      if (linkError) throw linkError;
    }

    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    next(error);
  }
});

// Update question
router.put('/:id', [
  body('title').optional().isLength({ min: 5, max: 200 }),
  body('description').optional().isLength({ min: 10 }),
  body('tags').optional().isArray({ min: 1, max: 5 })
], authenticateToken, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, tags } = req.body;

    // Check if user owns the question
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Question not found' });
      }
      throw fetchError;
    }

    if (question.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this question' });
    }

    // Update question
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedQuestion, error } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    // Update tags if provided
    if (tags) {
      // Remove existing tags
      await supabase
        .from('question_tags')
        .delete()
        .eq('question_id', id);

      // Add new tags
      for (const tagName of tags) {
        let { data: tag, error: tagError } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName.toLowerCase())
          .single();

        if (tagError && tagError.code === 'PGRST116') {
          const { data: newTag, error: createError } = await supabase
            .from('tags')
            .insert({ name: tagName.toLowerCase() })
            .select('id')
            .single();
          
          if (createError) throw createError;
          tag = newTag;
        } else if (tagError) {
          throw tagError;
        }

        await supabase
          .from('question_tags')
          .insert({
            question_id: id,
            tag_id: tag.id
          });
      }
    }

    res.json({
      message: 'Question updated successfully',
      question: updatedQuestion
    });
  } catch (error) {
    next(error);
  }
});

// Delete question
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user owns the question or is admin
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Question not found' });
      }
      throw fetchError;
    }

    if (question.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this question' });
    }

    // Delete question (cascade will handle related records)
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;