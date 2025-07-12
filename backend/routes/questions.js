const express = require('express');
  const { supabase } = require('../config/supabase');
  const { authenticateToken, optionalAuth } = require('../middleware/auth');
  const { validate, schemas } = require('../middleware/validation');
  
  const router = express.Router();
  
  // Get all questions with pagination and filtering
  router.get('/', optionalAuth, async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        tag, 
        search, 
        sort = 'recent' 
      } = req.query;
  
      const offset = (page - 1) * limit;
  
      let query = supabase
        .from('questions')
        .select(`
          *,
          users:user_id (id, username),
          question_tags!inner (
            tags (id, name)
          ),
          answers (id),
          votes (id, type)
        `)
        .eq('is_deleted', false);
  
      // Apply filters
      if (tag) {
        query = query.contains('question_tags.tags.name', [tag]);
      }
  
      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      }
  
      // Apply sorting
      switch (sort) {
        case 'popular':
          // This would need a computed column or separate query for vote counts
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }
  
      const { data: questions, error } = await query
        .range(offset, offset + limit - 1);
  
      if (error) {
        throw error;
      }
  
      // Process the data to include vote counts and user vote status
      const processedQuestions = questions.map(question => {
        const upvotes = question.votes.filter(v => v.type === 'upvote').length;
        const downvotes = question.votes.filter(v => v.type === 'downvote').length;
        const userVote = req.user ? 
          question.votes.find(v => v.user_id === req.user.id)?.type : null;
  
        return {
          ...question,
          author: question.users,
          tags: question.question_tags.map(qt => qt.tags),
          answer_count: question.answers.length,
          vote_count: upvotes - downvotes,
          user_vote: userVote,
          votes: undefined,
          users: undefined,
          question_tags: undefined,
          answers: undefined
        };
      });
  
      res.json({
        success: true,
        data: {
          questions: processedQuestions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            has_more: questions.length === parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get questions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch questions'
      });
    }
  });
  
  // Get single question with answers
  router.get('/:id', optionalAuth, async (req, res) => {
    try {
      const { id } = req.params;
  
      const { data: question, error } = await supabase
        .from('questions')
        .select(`
          *,
          users:user_id (id, username),
          question_tags (
            tags (id, name)
          ),
          answers (
            *,
            users:user_id (id, username),
            votes (id, type, user_id)
          ),
          votes (id, type, user_id)
        `)
        .eq('id', id)
        .eq('is_deleted', false)
        .single();
  
      if (error || !question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }
  
      // Process votes for question
      const questionUpvotes = question.votes.filter(v => v.type === 'upvote').length;
      const questionDownvotes = question.votes.filter(v => v.type === 'downvote').length;
      const userQuestionVote = req.user ? 
        question.votes.find(v => v.user_id === req.user.id)?.type : null;
  
      // Process answers with votes
      const processedAnswers = question.answers
        .filter(answer => !answer.is_deleted)
        .map(answer => {
          const upvotes = answer.votes.filter(v => v.type === 'upvote').length;
          const downvotes = answer.votes.filter(v => v.type === 'downvote').length;
          const userVote = req.user ? 
            answer.votes.find(v => v.user_id === req.user.id)?.type : null;
  
          return {
            ...answer,
            author: answer.users,
            vote_count: upvotes - downvotes,
            user_vote: userVote,
            can_accept: req.user && req.user.id === question.user_id,
            votes: undefined,
            users: undefined
          };
        })
        .sort((a, b) => {
          // Accepted answer first, then by vote count
          if (a.is_accepted && !b.is_accepted) return -1;
          if (!a.is_accepted && b.is_accepted) return 1;
          return b.vote_count - a.vote_count;
        });
  
      const processedQuestion = {
        ...question,
        author: question.users,
        tags: question.question_tags.map(qt => qt.tags),
        answers: processedAnswers,
        vote_count: questionUpvotes - questionDownvotes,
        user_vote: userQuestionVote,
        can_edit: req.user && req.user.id === question.user_id,
        votes: undefined,
        users: undefined,
        question_tags: undefined
      };
  
      res.json({
        success: true,
        data: { question: processedQuestion }
      });
    } catch (error) {
      console.error('Get question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch question'
      });
    }
  });
  
  // Create new question
  router.post('/', authenticateToken, validate(schemas.question), async (req, res) => {
    try {
      const { title, content, tags } = req.body;
  
      // Create question
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert([{
          title,
          content,
          user_id: req.user.id
        }])
        .select()
        .single();
  
      if (questionError) {
        throw questionError;
      }
  
      // Handle tags
      for (const tagName of tags) {
        // Get or create tag
        let { data: tag, error: tagError } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName)
          .single();
  
        if (tagError || !tag) {
          // Create new tag
          const { data: newTag, error: createTagError } = await supabase
            .from('tags')
            .insert([{ name: tagName }])
            .select('id')
            .single();
  
          if (createTagError) {
            throw createTagError;
          }
          tag = newTag;
        }
  
        // Link tag to question
        const { error: linkError } = await supabase
          .from('question_tags')
          .insert([{
            question_id: question.id,
            tag_id: tag.id
          }]);
  
        if (linkError) {
          throw linkError;
        }
      }
  
      res.status(201).json({
        success: true,
        message: 'Question created successfully',
        data: { question }
      });
    } catch (error) {
      console.error('Create question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create question'
      });
    }
  });
  
  // Update question
  router.put('/:id', authenticateToken, validate(schemas.question), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, tags } = req.body;
  
      // Check if user owns the question
      const { data: question, error: checkError } = await supabase
        .from('questions')
        .select('user_id')
        .eq('id', id)
        .single();
  
      if (checkError || !question || question.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to edit this question'
        });
      }
  
      // Update question
      const { data: updatedQuestion, error: updateError } = await supabase
        .from('questions')
        .update({ title, content, updated_at: new Date() })
        .eq('id', id)
        .select()
        .single();
  
      if (updateError) {
        throw updateError;
      }
  
      // Update tags - remove old ones and add new ones
      await supabase
        .from('question_tags')
        .delete()
        .eq('question_id', id);
  
      // Add new tags
      for (const tagName of tags) {
        let { data: tag, error: tagError } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName)
          .single();
  
        if (tagError || !tag) {
          const { data: newTag, error: createTagError } = await supabase
            .from('tags')
            .insert([{ name: tagName }])
            .select('id')
            .single();
  
          if (createTagError) {
            throw createTagError;
          }
          tag = newTag;
        }
  
        await supabase
          .from('question_tags')
          .insert([{
            question_id: id,
            tag_id: tag.id
          }]);
      }
  
      res.json({
        success: true,
        message: 'Question updated successfully',
        data: { question: updatedQuestion }
      });
    } catch (error) {
      console.error('Update question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update question'
      });
    }
  });
  
  // Delete question
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
  
      // Check if user owns the question or is admin
      const { data: question, error: checkError } = await supabase
        .from('questions')
        .select('user_id')
        .eq('id', id)
        .single();
  
      if (checkError || !question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }
  
      if (question.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this question'
        });
      }
  
      // Soft delete
      const { error } = await supabase
        .from('questions')
        .update({ is_deleted: true, updated_at: new Date() })
        .eq('id', id);
  
      if (error) {
        throw error;
      }
  
      res.json({
        success: true,
        message: 'Question deleted successfully'
      });
    } catch (error) {
      console.error('Delete question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete question'
      });
    }
  });
  
  // Vote on question
  router.post('/:id/vote', authenticateToken, validate(schemas.vote), async (req, res) => {
    try {
      const { id } = req.params;
      const { type } = req.body;
  
      // Check if question exists
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select('id')
        .eq('id', id)
        .single();
  
      if (questionError || !question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }
  
      // Check existing vote
      const { data: existingVote, error: voteError } = await supabase
        .from('votes')
        .select('id, type')
        .eq('question_id', id)
        .eq('user_id', req.user.id)
        .single();
  
      if (existingVote) {
        if (existingVote.type === type) {
          // Remove vote if same type
          await supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id);
  
          return res.json({
            success: true,
            message: 'Vote removed'
          });
        } else {
          // Update vote type
          await supabase
            .from('votes')
            .update({ type })
            .eq('id', existingVote.id);
  
          return res.json({
            success: true,
            message: 'Vote updated'
          });
        }
      }
  
      // Create new vote
      const { error: createError } = await supabase
        .from('votes')
        .insert([{
          question_id: id,
          user_id: req.user.id,
          type
        }]);
  
      if (createError) {
        throw createError;
      }
  
      res.json({
        success: true,
        message: 'Vote recorded'
      });
    } catch (error) {
      console.error('Vote question error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to vote on question'
      });
    }
  });
  
  module.exports = router;