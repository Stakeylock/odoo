const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  // Client for regular operations
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Admin client for operations requiring service role
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  module.exports = {
    supabase,
    supabaseAdmin
  };
  
  // =============================================================================
  // middleware/auth.js
  // =============================================================================
  const jwt = require('jsonwebtoken');
  const { supabase } = require('../config/supabase');
  
  // Middleware to authenticate JWT tokens
  const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify user still exists in database
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role, is_active')
        .eq('id', decoded.userId)
        .single();
  
      if (error || !user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
  
      req.user = user;
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    }
  };
  
  // Middleware to check if user is admin
  const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  };
  
  // Optional authentication - sets user if token provided
  const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (!token) {
      req.user = null;
      return next();
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role, is_active')
        .eq('id', decoded.userId)
        .single();
  
      if (!error && user && user.is_active) {
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (error) {
      req.user = null;
    }
  
    next();
  };
  
  module.exports = {
    authenticateToken,
    requireAdmin,
    optionalAuth
  };
  