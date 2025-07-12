const express = require('express');
  const { supabase } = require('../config/supabase');
  
  const router = express.Router();
  
  // Get all tags
  router.get('/', async (req, res) => {
    try {
      const { search, limit = 20 } = req.query;
  
      let query = supabase
        .from('tags')
        .select(`
          id, name, // Explicitly selecting tag columns
          question_tags ( // Join with question_tags
            question_id, // Question_tags schema: question_id
            questions!inner ( // Join with questions
              id,
              is_deleted // Assuming 'is_deleted' exists for questions
            )
          )
        `);
  
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
  
      const { data: tags, error } = await query
        .order('name')
        .limit(limit);
  
      if (error) {
        throw error;
      }
  
      // Process tags to include question count
      const processedTags = tags.map(tag => {
        const questionCount = tag.question_tags.filter(
          qt => !qt.questions.is_deleted
        ).length;
  
        return {
          id: tag.id,
          name: tag.name,
          // description: tag.description, // Removed as 'description' is not in your tags schema
          question_count: questionCount
        };
      });
  
      res.json({
        success: true,
        data: { tags: processedTags }
      });
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tags'
      });
    }
  });
  
  // Get popular tags
  router.get('/popular', async (req, res) => {
    try {
      const { limit = 10 } = req.query;
  
      const { data: tags, error } = await supabase
        .from('tags')
        .select(`
          id, name, // Explicitly selecting tag columns
          question_tags ( // Join with question_tags
            question_id, // Question_tags schema: question_id
            questions!inner ( // Join with questions
              id,
              is_deleted // Assuming 'is_deleted' exists for questions
            )
          )
        `)
        .order('name');
  
      if (error) {
        throw error;
      }
  
      // Process and sort by question count
      const processedTags = tags
        .map(tag => {
          const questionCount = tag.question_tags.filter(
            qt => !qt.questions.is_deleted
          ).length;
  
          return {
            id: tag.id,
            name: tag.name,
            // description: tag.description, // Removed as 'description' is not in your tags schema
            question_count: questionCount
          };
        })
        .filter(tag => tag.question_count > 0)
        .sort((a, b) => b.question_count - a.question_count)
        .slice(0, limit);
  
      res.json({
        success: true,
        data: { tags: processedTags }
      });
    } catch (error) {
      console.error('Get popular tags error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get popular tags'
      });
    }
  });
  
  module.exports = router;
