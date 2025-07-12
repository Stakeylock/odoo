const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Create answer
router.post('/', authenticateToken, validate(schemas.answer), async (req, res) => {
  try {
    const { content, question_id } = req.body;

    // Check if question exists
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, user_id')
      .eq('id', question_id)
      .eq('is_deleted', false)
      .single();

    if (questionError || !question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Create answer
    const { data: answer, error: answerError } = await supabase
      .from('answers')
      .insert([{
        content,
        question_id,
        user_id: req.user.id
      }])
      .select()
      .single();

    if (answerError) {
      throw answerError;
    }

    // Create notification for question owner
    if (question.user_id !== req.user.id) {
      await supabase
        .from('notifications')
        .insert([{
          user_id: question.user_id,
          type: 'answer',
          message: `${req.user.username} answered your question`,
          related_id: question_id,
          related_type: 'question'
        }]);
    }

    res.status(201).json({
      success: true,
      message: 'Answer created successfully',
      data: { answer }
    });
  } catch (error) {
    console.error('Create answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create answer'
    });
  }
});

// Update answer
router.put('/:id', authenticateToken, validate(schemas.answer), async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // Check if user owns the answer
    const { data: answer, error: checkError } = await supabase
      .from('answers')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !answer || answer.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this answer'
      });
    }

    // Update answer
    const { data: updatedAnswer, error: updateError } = await supabase
      .from('answers')
      .update({ content, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      message: 'Answer updated successfully',
      data: { answer: updatedAnswer }
    });
  } catch (error) {
    console.error('Update answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update answer'
    });
  }
});

// Delete answer
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the answer or is admin
    const { data: answer, error: checkError } = await supabase
      .from('answers')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    if (answer.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this answer'
      });
    }

    // Soft delete
    const { error } = await supabase
      .from('answers')
      .update({ is_deleted: true, updated_at: new Date() })
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Answer deleted successfully'
    });
  } catch (error) {
    console.error('Delete answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete answer'
    });
  }
});

// Vote on answer
router.post('/:id/vote', authenticateToken, validate(schemas.vote), async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    // Check if answer exists
    const { data: answer, error: answerError } = await supabase
      .from('answers')
      .select('id')
      .eq('id', id)
      .single();

    if (answerError || !answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Check existing vote
    const { data: existingVote, error: voteError } = await supabase
      .from('votes')
      .select('id, type')
      .eq('answer_id', id)
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
        answer_id: id,
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
    console.error('Vote answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to vote on answer'
    });
  }
});

// Accept answer
router.post('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get answer with question info
    const { data: answer, error: answerError } = await supabase
      .from('answers')
      .select(`
        id,
        question_id,
        user_id,
        questions:question_id (user_id)
      `)
      .eq('id', id)
      .single();

    if (answerError || !answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    // Check if user owns the question
    if (answer.questions.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only question owner can accept answers'
      });
    }

    // Unaccept any previously accepted answer for this question
    await supabase
      .from('answers')
      .update({ is_accepted: false })
      .eq('question_id', answer.question_id)
      .eq('is_accepted', true);

    // Accept this answer
    const { error: acceptError } = await supabase
      .from('answers')
      .update({ is_accepted: true, updated_at: new Date() })
      .eq('id', id);

    if (acceptError) {
      throw acceptError;
    }

    // Create notification for answer author
    if (answer.user_id !== req.user.id) {
      await supabase
        .from('notifications')
        .insert([{
          user_id: answer.user_id,
          type: 'accept',
          message: `${req.user.username} accepted your answer`,
          related_id: answer.question_id,
          related_type: 'question'
        }]);
    }

    res.json({
      success: true,
      message: 'Answer accepted successfully'
    });
  } catch (error) {
    console.error('Accept answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept answer'
    });
  }
});

module.exports = router;