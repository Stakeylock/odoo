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
          id, title, description, user_id, created_at, is_deleted, // Explicitly selecting question columns
          users:user_id (id, username), // Assuming users table has id, username
          question_tags!inner ( // Join with question_tags
            tags (id, name) // Join with tags table
          ),
          answers (id), // Select answer IDs for count
          votes (id, vote_type, user_id) // Select vote IDs and type for count and user vote status
        `)
        .eq('is_deleted', false); // Assuming 'is_deleted' exists for questions
  
      // Apply filters
      if (tag) {
        query = query.contains('question_tags.tags.name', [tag]);
      }
  
      if (search) {
        // Assuming 'content' column exists for full-text search, if not, remove or adjust
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`); // Changed 'content' to 'description'
      }
  
      // Apply sorting
      switch (sort) {
        case 'popular':
          // This would need a computed column or separate query for vote counts
          // For now, sorting by created_at as popular requires complex join/aggregation
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
        const upvotes = question.votes.filter(v => v.vote_type === 'upvote').length; // Changed 'type' to 'vote_type'
        const downvotes = question.votes.filter(v => v.vote_type === 'downvote').length; // Changed 'type' to 'vote_type'
        const userVote = req.user ? 
          question.votes.find(v => v.user_id === req.user.id)?.vote_type : null; // Changed 'type' to 'vote_type'
  
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
          answers: undefined,
          is_deleted: undefined // Assuming is_deleted is not needed in final output
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
          id, title, description, user_id, created_at, is_deleted, // Explicitly selecting question columns
          users:user_id (id, username), // Users schema: id, username
          question_tags ( // Join with question_tags
            tags (id, name) // Tags schema: id, name
          ),
          answers ( // Answers schema: id, question_id, user_id, answer, is_accepted, created_at, is_deleted (assuming is_deleted exists)
            id, question_id, user_id, answer, is_accepted, created_at, is_deleted,
            users:user_id (id, username), // Users schema: id, username
            votes (id, vote_type, user_id) // Votes schema: id, user_id, answer_id, vote_type
          ),
          votes (id, vote_type, user_id) // Votes schema: id, user_id, question_id, vote_type (assuming question_id also exists for question votes)
        `)
        .eq('id', id)
        .eq('is_deleted', false) // Assuming 'is_deleted' exists for questions
        .single();
  
      if (error || !question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }
  
      // Process votes for question
      const questionUpvotes = question.votes.filter(v => v.vote_type === 'upvote').length; // Changed 'type' to 'vote_type'
      const questionDownvotes = question.votes.filter(v => v.vote_type === 'downvote').length; // Changed 'type' to 'vote_type'
      const userQuestionVote = req.user ? 
        question.votes.find(v => v.user_id === req.user.id)?.vote_type : null; // Changed 'type' to 'vote_type'
  
      // Process answers with votes
      const processedAnswers = question.answers
        .filter(answer => !answer.is_deleted) // Filter out soft-deleted answers
        .map(answer => {
          const upvotes = answer.votes.filter(v => v.vote_type === 'upvote').length; // Changed 'type' to 'vote_type'
          const downvotes = answer.votes.filter(v => v.vote_type === 'downvote').length; // Changed 'type' to 'vote_type'
          const userVote = req.user ? 
            answer.votes.find(v => v.user_id === req.user.id)?.vote_type : null; // Changed 'type' to 'vote_type'
  
          return {
            ...answer,
            author: answer.users,
            vote_count: upvotes - downvotes,
            user_vote: userVote,
            can_accept: req.user && req.user.id === question.user_id, // Assuming req.user.id is available
            votes: undefined,
            users: undefined,
            is_deleted: undefined // Assuming is_deleted is not needed in final output
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
        can_edit: req.user && req.user.id === question.user_id, // Assuming req.user.id is available
        votes: undefined,
        users: undefined,
        question_tags: undefined,
        is_deleted: undefined // Assuming is_deleted is not needed in final output
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
      const { title, content, tags } = req.body; // 'content' maps to 'description'

      // Create question
      // Questions schema: title, description, user_id, created_at
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert([{
          title,
          description: content, // Mapped 'content' to 'description'
          user_id: req.user.id
        }])
        .select('id, title, description, user_id, created_at') // Explicitly select columns
        .single();
  
      if (questionError) {
        throw questionError;
      }
  
      // Handle tags
      for (const tagName of tags) {
        // Get or create tag
        // Tags schema: id, name
        let { data: tag, error: tagError } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName)
          .single();
  
        if (tagError || !tag) {
          // Create new tag
          // Tags schema: name
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
        // Question_tags schema: question_id, tag_id
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
      const { title, content, tags } = req.body; // 'content' maps to 'description'
  
      // Check if user owns the question
      // Questions schema: user_id
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
      // Questions schema: title, description, updated_at (assuming updated_at exists)
      const { data: updatedQuestion, error: updateError } = await supabase
        .from('questions')
        .update({ title, description: content, updated_at: new Date() }) // Mapped 'content' to 'description'
        .eq('id', id)
        .select('id, title, description, user_id, created_at') // Explicitly select columns
        .single();
  
      if (updateError) {
        throw updateError;
      }
  
      // Update tags - remove old ones and add new ones
      // Question_tags schema: question_id
      await supabase
        .from('question_tags')
        .delete()
        .eq('question_id', id);
  
      // Add new tags
      for (const tagName of tags) {
        // Tags schema: id, name
        let { data: tag, error: tagError } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName)
          .single();
  
        if (tagError || !tag) {
          // Tags schema: name
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
  
        // Question_tags schema: question_id, tag_id
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
      // Questions schema: user_id
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
      // Questions schema: is_deleted (assuming it exists), updated_at (assuming it exists)
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
      const { type } = req.body; // 'type' maps to 'vote_type'
  
      // Check if question exists
      // Questions schema: id
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
      // Votes schema: id, vote_type, question_id, user_id
      const { data: existingVote, error: voteError } = await supabase
        .from('votes')
        .select('id, vote_type') // Changed 'type' to 'vote_type'
        .eq('question_id', id)
        .eq('user_id', req.user.id)
        .single();
  
      if (existingVote) {
        if (existingVote.vote_type === type) { // Changed 'type' to 'vote_type'
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
          // Votes schema: vote_type
          await supabase
            .from('votes')
            .update({ vote_type: type }) // Changed 'type' to 'vote_type'
            .eq('id', existingVote.id);
  
          return res.json({
            success: true,
            message: 'Vote updated'
          });
        }
      }
  
      // Create new vote
      // Votes schema: question_id, user_id, vote_type
      const { error: createError } = await supabase
        .from('votes')
        .insert([{
          question_id: id,
          user_id: req.user.id,
          vote_type: type // Changed 'type' to 'vote_type'
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
