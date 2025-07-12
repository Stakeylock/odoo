const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('is_active', true);

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id', { count: 'exact' })
      .eq('is_deleted', false);

    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('id', { count: 'exact' })
      .eq('is_deleted', false);

    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('id', { count: 'exact' });

    const stats = {
      users_count: users ? users.length : 0,
      questions_count: questions ? questions.length : 0,
      answers_count: answers ? answers.length : 0,
      tags_count: tags ? tags.length : 0
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
});

// Get reported content (placeholder - would need reporting system)
router.get('/reports', async (req, res) => {
  res.json({
    success: true,
    data: { reports: [] },
    message: 'Reporting system not implemented yet'
  });
});

// Delete question (hard delete)
router.delete('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete related records first
    await supabase.from('question_tags').delete().eq('question_id', id);
    await supabase.from('votes').delete().eq('question_id', id);
    await supabase.from('notifications').delete().eq('related_id', id).eq('related_type', 'question');
    
    // Delete answers and their votes
    const { data: answers } = await supabase
      .from('answers')
      .select('id')
      .eq('question_id', id);

    if (answers) {
      for (const answer of answers) {
        await supabase.from('votes').delete().eq('answer_id', answer.id);
      }
    }

    await supabase.from('answers').delete().eq('question_id', id);
    
    // Finally delete the question
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Question deleted permanently'
    });
  } catch (error) {
    console.error('Admin delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question'
    });
  }
});

// Delete answer (hard delete)
router.delete('/answers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete related records first
    await supabase.from('votes').delete().eq('answer_id', id);
    await supabase.from('notifications').delete().eq('related_id', id).eq('related_type', 'answer');
    
    // Delete the answer
    const { error } = await supabase
      .from('answers')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Answer deleted permanently'
    });
  } catch (error) {
    console.error('Admin delete answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete answer'
    });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, username, role, is_active, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          has_more: users.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
});

// Deactivate user
router.put('/users/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user'
    });
  }
});

// Activate user
router.put('/users/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user'
    });
  }
});

module.exports = router;
