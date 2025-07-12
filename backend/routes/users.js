const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
  
// CRITICAL DEBUGGING CHECK: Ensure Supabase client is properly initialized
if (!supabase || typeof supabase.from !== 'function') {
    console.error('CRITICAL ERROR: Supabase client is not properly initialized or exported in ../config/supabase.js.');
    console.error('Please verify the contents of ../config/supabase.js and ensure your .env file has correct SUPABASE_URL and SUPABASE_KEY values.');
    // You might want to throw an error here to prevent the server from starting with a broken dependency:
    // throw new Error('Supabase client is unavailable. Check configuration.');
}

const router = express.Router();
  
// Get user profile
router.get('/:id', async (req, res, next) => { // Added 'next' for error passing
    console.log('--- Get User Profile Endpoint Hit ---');
    const { id } = req.params;
    console.log(`Attempting to fetch profile for user ID: ${id}`);

    try {
        // Fetch user basic info
        console.log('Fetching user basic info from "users" table...');
        const { data: user, error: userError } = await supabase
            .from('users')
            // Ensure these columns exist in your 'users' table
            .select('id, username, email, role, created_at, is_active') // Added is_active to select for clarity
            .eq('id', id)
            .single();

        if (userError && userError.code !== 'PGRST116') { // PGRST116 means no row found
            console.error('Supabase error fetching user basic info:', userError.message);
            throw new Error(`Database error fetching user basic info: ${userError.message}`);
        }

        if (!user || !user.is_active) { // Check if user exists and is active
            console.warn(`User with ID ${id} not found or is inactive.`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        console.log('User basic info fetched successfully:', user.id, user.username);

        // Get user stats - Questions Count
        console.log('Fetching questions count...');
        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('id', { count: 'exact' })
            .eq('user_id', id)
            .eq('is_deleted', false); // Ensure 'is_deleted' exists in 'questions' table

        if (questionsError) {
            console.error('Supabase error fetching questions count:', questionsError.message);
            throw new Error(`Database error fetching questions count: ${questionsError.message}`);
        }
        console.log('Questions count fetched.');

        // Get user stats - Answers Count
        console.log('Fetching answers count...');
        const { data: answers, error: answersError } = await supabase
            .from('answers')
            .select('id', { count: 'exact' })
            .eq('user_id', id)
            .eq('is_deleted', false); // Ensure 'is_deleted' exists in 'answers' table

        if (answersError) {
            console.error('Supabase error fetching answers count:', answersError.message);
            throw new Error(`Database error fetching answers count: ${answersError.message}`);
        }
        console.log('Answers count fetched.');

        // Get user stats - Accepted Answers Count
        console.log('Fetching accepted answers count...');
        const { data: acceptedAnswers, error: acceptedError } = await supabase
            .from('answers')
            .select('id', { count: 'exact' })
            .eq('user_id', id)
            .eq('is_accepted', true) // Ensure 'is_accepted' exists in 'answers' table
            .eq('is_deleted', false);

        if (acceptedError) {
            console.error('Supabase error fetching accepted answers count:', acceptedError.message);
            throw new Error(`Database error fetching accepted answers count: ${acceptedError.message}`);
        }
        console.log('Accepted answers count fetched.');

        const stats = {
            questions_count: questions ? questions.length : 0,
            answers_count: answers ? answers.length : 0,
            accepted_answers_count: acceptedAnswers ? acceptedAnswers.length : 0
        };
        console.log('Aggregated user stats:', stats);

        res.json({
            success: true,
            data: { 
                user: {
                    ...user,
                    stats
                }
            }
        });
        console.log('User profile response sent.');
    } catch (error) {
        console.error('--- General Get User Profile Error Caught ---');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        // Pass the error to the next middleware (errorHandler)
        next(error);
    } finally {
        console.log('--- Get User Profile Endpoint Finished ---');
    }
});
  
// Get user's questions
router.get('/:id/questions', async (req, res, next) => {
    console.log('--- Get User Questions Endpoint Hit ---');
    const { id } = req.params;
    console.log(`Attempting to fetch questions for user ID: ${id}`);
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        console.log('Fetching questions with relations...');
        const { data: questions, error } = await supabase
            .from('questions')
            .select(`
                id, title, description, user_id, created_at, is_deleted,
                question_tags (
                    tags (id, name)
                ),
                answers (id),
                votes (id, vote_type)
            `)
            .eq('user_id', id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Supabase error fetching user questions:', error.message);
            throw error;
        }
        console.log(`Fetched ${questions ? questions.length : 0} questions.`);

        const processedQuestions = questions.map(question => {
            const upvotes = question.votes.filter(v => v.vote_type === 'upvote').length;
            const downvotes = question.votes.filter(v => v.vote_type === 'downvote').length;

            return {
                ...question,
                tags: question.question_tags.map(qt => qt.tags),
                answer_count: question.answers.length,
                vote_count: upvotes - downvotes,
                votes: undefined,
                question_tags: undefined,
                answers: undefined,
                is_deleted: undefined
            };
        });
        console.log('Processed questions for response.');

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
        console.log('User questions response sent.');
    } catch (error) {
        console.error('--- General Get User Questions Error Caught ---');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        next(error);
    } finally {
        console.log('--- Get User Questions Endpoint Finished ---');
    }
});
  
// Get user's answers
router.get('/:id/answers', async (req, res, next) => {
    console.log('--- Get User Answers Endpoint Hit ---');
    const { id } = req.params;
    console.log(`Attempting to fetch answers for user ID: ${id}`);
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        console.log('Fetching answers with relations...');
        const { data: answers, error } = await supabase
            .from('answers')
            .select(`
                id, question_id, user_id, answer, is_accepted, created_at, is_deleted,
                questions (id, title),
                votes (id, vote_type)
            `)
            .eq('user_id', id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Supabase error fetching user answers:', error.message);
            throw error;
        }
        console.log(`Fetched ${answers ? answers.length : 0} answers.`);

        const processedAnswers = answers.map(answer => {
            const upvotes = answer.votes.filter(v => v.vote_type === 'upvote').length;
            const downvotes = answer.votes.filter(v => v.vote_type === 'downvote').length;

            return {
                ...answer,
                question: answer.questions,
                vote_count: upvotes - downvotes,
                votes: undefined,
                questions: undefined,
                is_deleted: undefined
            };
        });
        console.log('Processed answers for response.');

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
        console.log('User answers response sent.');
    } catch (error) {
        console.error('--- General Get User Answers Error Caught ---');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        next(error);
    } finally {
        console.log('--- Get User Answers Endpoint Finished ---');
    }
});
  
module.exports = router;
