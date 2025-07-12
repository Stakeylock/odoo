const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// CRITICAL DEBUGGING CHECK: Ensure Supabase client is properly initialized
if (!supabase || typeof supabase.from !== 'function') {
    console.error('CRITICAL ERROR in answers.js: Supabase client is not properly initialized or exported in ../config/supabase.js.');
    console.error('Please verify the contents of ../config/supabase.js and ensure your .env file has correct SUPABASE_URL and SUPABASE_ANON_KEY values.');
}

const router = express.Router();

// Create answer
router.post('/', authenticateToken, validate(schemas.answer), async (req, res, next) => { // Added next
  console.log('--- Create Answer Endpoint Hit ---');
  console.log('Request Body:', req.body);
  try {
    const { content, question_id } = req.body;
    console.log(`Attempting to create answer for question ID: ${question_id}`);

    // Check if question exists
    console.log('Checking if question exists and is not deleted...');
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, user_id')
      .eq('id', question_id)
      .eq('is_deleted', false) // Assuming 'is_deleted' exists for questions
      .single();

    if (questionError) {
        console.error('Supabase error during question existence check:', questionError.message);
        // If it's not just "no row found" (PGRST116), then it's a real DB error
        if (questionError.code !== 'PGRST116') {
            throw new Error(`Database error checking question existence: ${questionError.message}`);
        }
    }

    if (!question) {
      console.warn(`Question with ID ${question_id} not found or is deleted.`);
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    console.log('Question found:', question.id);


    // Create answer
    console.log('Attempting to insert new answer...');
    const { data: answer, error: answerError } = await supabase
      .from('answers')
      .insert([{
        answer: content, // Mapped 'content' to 'answer' column
        question_id,
        user_id: req.user.id
      }])
      .select()
      .single();

    if (answerError) {
      console.error('Supabase error during answer insertion:', answerError.message);
      throw new Error(`Database error creating answer: ${answerError.message}`);
    }
    console.log('Answer inserted successfully:', answer.id);

    // Create notification for question owner
    // Notifications schema: user_id, type, message, related_id, related_type, created_at
    if (question.user_id !== req.user.id) {
      console.log(`Creating notification for question owner: ${question.user_id}`);
      await supabase
        .from('notifications')
        .insert([{
          user_id: question.user_id,
          type: 'answer',
          message: `${req.user.username} answered your question`,
          related_id: question_id,
          related_type: 'question'
        }]);
      console.log('Notification created.');
    }

    res.status(201).json({
      success: true,
      message: 'Answer created successfully',
      data: { answer }
    });
    console.log('Answer creation successful response sent.');
  } catch (error) {
    console.error('--- General Create Answer Error Caught ---');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    next(error);
  } finally {
    console.log('--- Create Answer Endpoint Finished ---');
  }
});

// ... (rest of your answers.js code, including update, delete, vote, accept)

// Update answer
router.put('/:id', authenticateToken, validate(schemas.answer), async (req, res, next) => {
    console.log('--- Update Answer Endpoint Hit ---');
    const { id } = req.params;
    const { content } = req.body;
    console.log(`Attempting to update answer ID: ${id}`);
    try {
        // Check if user owns the answer
        console.log('Checking if user owns the answer...');
        const { data: answer, error: checkError } = await supabase
            .from('answers')
            .select('user_id')
            .eq('id', id)
            .single();

        if (checkError || !answer || answer.user_id !== req.user.id) {
            console.warn(`Update failed: Not authorized to edit answer ID ${id}.`);
            return res.status(403).json({
                success: false,
                message: 'Not authorized to edit this answer'
            });
        }
        console.log('User authorized to update answer.');

        // Update answer
        console.log('Updating answer content...');
        const { data: updatedAnswer, error: updateError } = await supabase
            .from('answers')
            .update({ answer: content, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Supabase error during answer update:', updateError.message);
            throw new Error(`Database error updating answer: ${updateError.message}`);
        }
        console.log('Answer updated successfully:', updatedAnswer.id);

        res.json({
            success: true,
            message: 'Answer updated successfully',
            data: { answer: updatedAnswer }
        });
        console.log('Answer update successful response sent.');
    } catch (error) {
        console.error('--- General Update Answer Error Caught ---');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        next(error);
    } finally {
        console.log('--- Update Answer Endpoint Finished ---');
    }
});

// Delete answer
router.delete('/:id', authenticateToken, async (req, res, next) => {
    console.log('--- Delete Answer Endpoint Hit ---');
    const { id } = req.params;
    console.log(`Attempting to delete answer ID: ${id}`);
    try {
        // Check if user owns the answer or is admin
        console.log('Checking authorization for answer deletion...');
        const { data: answer, error: checkError } = await supabase
            .from('answers')
            .select('user_id')
            .eq('id', id)
            .single();

        if (checkError || !answer) {
            console.warn(`Delete failed: Answer ID ${id} not found.`);
            return res.status(404).json({
                success: false,
                message: 'Answer not found'
            });
        }

        if (answer.user_id !== req.user.id && req.user.role !== 'admin') {
            console.warn(`Delete failed: User ${req.user.id} not authorized to delete answer ID ${id}. Role: ${req.user.role}`);
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this answer'
            });
        }
        console.log('User authorized to delete answer.');

        // Soft delete
        console.log('Performing soft delete on answer...');
        const { error } = await supabase
            .from('answers')
            .update({ is_deleted: true, updated_at: new Date() })
            .eq('id', id);

        if (error) {
            console.error('Supabase error during answer soft delete:', error.message);
            throw new Error(`Database error deleting answer: ${error.message}`);
        }
        console.log('Answer soft-deleted successfully.');

        res.json({
            success: true,
            message: 'Answer deleted successfully'
        });
        console.log('Answer deletion successful response sent.');
    } catch (error) {
        console.error('--- General Delete Answer Error Caught ---');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        next(error);
    } finally {
        console.log('--- Delete Answer Endpoint Finished ---');
    }
});

// Vote on answer
router.post('/:id/vote', authenticateToken, validate(schemas.vote), async (req, res, next) => {
    console.log('--- Vote Answer Endpoint Hit ---');
    const { id } = req.params;
    const { type } = req.body;
    console.log(`Attempting to vote '${type}' on answer ID: ${id}`);
    try {
        // Check if answer exists
        console.log('Checking if answer exists...');
        const { data: answer, error: answerError } = await supabase
            .from('answers')
            .select('id')
            .eq('id', id)
            .single();

        if (answerError || !answer) {
            console.warn(`Vote failed: Answer ID ${id} not found.`);
            return res.status(404).json({
                success: false,
                message: 'Answer not found'
            });
        }
        console.log('Answer found. Checking existing vote...');

        // Check existing vote
        const { data: existingVote, error: voteError } = await supabase
            .from('votes')
            .select('id, vote_type')
            .eq('answer_id', id)
            .eq('user_id', req.user.id)
            .single();

        if (voteError && voteError.code !== 'PGRST116') {
            console.error('Supabase error during existing vote check:', voteError.message);
            throw new Error(`Database error checking existing vote: ${voteError.message}`);
        }

        if (existingVote) {
            if (existingVote.vote_type === type) {
                console.log(`Existing vote of type '${type}' found. Removing vote.`);
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
                console.log(`Existing vote of type '${existingVote.vote_type}' found. Updating to '${type}'.`);
                // Update vote type
                await supabase
                    .from('votes')
                    .update({ vote_type: type })
                    .eq('id', existingVote.id);

                return res.json({
                    success: true,
                    message: 'Vote updated'
                });
            }
        }

        // Create new vote
        console.log(`No existing vote. Creating new '${type}' vote.`);
        const { error: createError } = await supabase
            .from('votes')
            .insert([{
                answer_id: id,
                user_id: req.user.id,
                vote_type: type
            }]);

        if (createError) {
            console.error('Supabase error during new vote creation:', createError.message);
            throw new Error(`Database error creating new vote: ${createError.message}`);
        }
        console.log('New vote recorded.');

        res.json({
            success: true,
            message: 'Vote recorded'
        });
        console.log('Vote answer successful response sent.');
    } catch (error) {
        console.error('--- General Vote Answer Error Caught ---');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        next(error);
    } finally {
        console.log('--- Vote Answer Endpoint Finished ---');
    }
});

// Accept answer
router.post('/:id/accept', authenticateToken, async (req, res, next) => {
    console.log('--- Accept Answer Endpoint Hit ---');
    const { id } = req.params;
    console.log(`Attempting to accept answer ID: ${id}`);
    try {
        // Get answer with question info
        console.log('Fetching answer with question owner info...');
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

        if (answerError) {
            console.error('Supabase error fetching answer for acceptance:', answerError.message);
            if (answerError.code !== 'PGRST116') {
                throw new Error(`Database error fetching answer for acceptance: ${answerError.message}`);
            }
        }

        if (!answer) {
            console.warn(`Accept failed: Answer ID ${id} not found.`);
            return res.status(404).json({
                success: false,
                message: 'Answer not found'
            });
        }
        console.log('Answer found. Checking question owner...');

        // Check if user owns the question
        if (!answer.questions || answer.questions.user_id !== req.user.id) {
            console.warn(`Accept failed: User ${req.user.id} is not the question owner for answer ID ${id}.`);
            return res.status(403).json({
                success: false,
                message: 'Only question owner can accept answers'
            });
        }
        console.log('User is question owner. Proceeding to accept.');

        // Unaccept any previously accepted answer for this question
        console.log(`Unaccepting previous accepted answers for question ID: ${answer.question_id}`);
        await supabase
            .from('answers')
            .update({ is_accepted: false })
            .eq('question_id', answer.question_id)
            .eq('is_accepted', true);
        console.log('Previous accepted answers unaccepted.');

        // Accept this answer
        console.log(`Accepting answer ID: ${id}`);
        const { error: acceptError } = await supabase
            .from('answers')
            .update({ is_accepted: true, updated_at: new Date() })
            .eq('id', id);

        if (acceptError) {
            console.error('Supabase error during answer acceptance:', acceptError.message);
            throw new Error(`Database error accepting answer: ${acceptError.message}`);
        }
        console.log('Answer accepted successfully.');

        // Create notification for answer author
        // Notifications schema: user_id, type, message, related_id, related_type
        if (answer.user_id !== req.user.id) {
            console.log(`Creating notification for answer author: ${answer.user_id}`);
            await supabase
                .from('notifications')
                .insert([{
                    user_id: answer.user_id,
                    type: 'accept',
                    message: `${req.user.username} accepted your answer`,
                    related_id: answer.question_id,
                    related_type: 'question'
                }]);
            console.log('Notification created.');
        }

        res.json({
            success: true,
            message: 'Answer accepted successfully'
        });
        console.log('Answer acceptance successful response sent.');
    } catch (error) {
        console.error('--- General Accept Answer Error Caught ---');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        next(error);
    } finally {
        console.log('--- Accept Answer Endpoint Finished ---');
    }
});

module.exports = router;
