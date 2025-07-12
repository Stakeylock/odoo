const express = require('express');
  const { supabase } = require('../config/supabase');
  const { authenticateToken } = require('../middleware/auth');
  
  const router = express.Router();
  
  // Get user profile
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
  
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, email, role, created_at')
        .eq('id', id)
        .eq('is_active', true)
        .single();
  
      if (error || !user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
  
      // Get user stats
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id')
        .eq('user_id', id)
        .eq('is_deleted', false);
  
      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select('id')
        .eq('user_id', id)
        .eq('is_deleted', false);
  
      const { data: acceptedAnswers, error: acceptedError } = await supabase
        .from('answers')
        .select('id')
        .eq('user_id', id)
        .eq('is_accepted', true)
        .eq('is_deleted', false);
  
      const stats = {
        questions_count: questions ? questions.length : 0,
        answers_count: answers ? answers.length : 0,
        accepted_answers_count: acceptedAnswers ? acceptedAnswers.length : 0
      };
  
      res.json({
        success: true,
        data: { 
          user: {
            ...user,
            stats
          }
        }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }
  });
  
  // Get user's questions
  router.get('/:id/questions', async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
  
      const { data: questions, error } = await supabase
        .from('questions')
        .select(`
          *,
          question_tags (
            tags (id, name)
          ),
          answers (id),
          votes (id, type)
        `)
        .eq('user_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
  
      if (error) {
        throw error;
      }
  
      const processedQuestions = questions.map(question => {
        const upvotes = question.votes.filter(v => v.type === 'upvote').length;
        const downvotes = question.votes.filter(v => v.type === 'downvote').length;
  
        return {
          ...question,
          tags: question.question_tags.map(qt => qt.tags),
          answer_count: question.answers.length,
          vote_count: upvotes - downvotes,
          votes: undefined,
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
      console.error('Get user questions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user questions'
      });
    }
  });
  
  // Get user's answers
  router.get('/:id/answers', async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
  
      const { data: answers, error } = await supabase
        .from('answers')
        .select(`
          *,
          questions (id, title),
          votes (id, type)
        `)
        .eq('user_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
  
      if (error) {
        throw error;
      }
  
      const processedAnswers = answers.map(answer => {
        const upvotes = answer.votes.filter(v => v.type === 'upvote').length;
        const downvotes = answer.votes.filter(v => v.type === 'downvote').length;
  
        return {
          ...answer,
          question: answer.questions,
          vote_count: upvotes - downvotes,
          votes: undefined,
          questions: undefined
        };
      });
  
      res.json({
        success: true,
        data: {
          answers: processedAnswers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            has_more: answers.length === parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get user answers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user answers'
      });
    }
  });
  
  module.exports = router;
  