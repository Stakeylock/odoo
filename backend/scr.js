
  
  // =============================================================================
  // .env.example
  // =============================================================================

  // server.js
  // =============================================================================
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const morgan = require('morgan');
  const rateLimit = require('express-rate-limit');
  require('dotenv').config();
  
  // Import routes
  const authRoutes = require('./routes/auth');
  const questionRoutes = require('./routes/questions');
  const answerRoutes = require('./routes/answers');
  const userRoutes = require('./routes/users');
  const tagRoutes = require('./routes/tags.js');
  const notificationRoutes = require('./routes/notifications');
  const uploadRoutes = require('./routes/upload');
  const adminRoutes = require('./routes/admin');
  
  // Import middleware
  const errorHandler = require('./middleware/errorHandler');
  const { authenticateToken } = require('./middleware/auth');
  
  const app = express();
  
  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use('/api/', limiter);
  
  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Logging
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/questions', questionRoutes);
  app.use('/api/answers', answerRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/tags', tagRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/admin', adminRoutes);
  
  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`
    });
  });
  
  // Error handling middleware
  app.use(errorHandler);
  
  const PORT = process.env.PORT || 5000;
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
  
  // =============================================================================
  // config/supabase.js
  // =============================================================================
  
  // =============================================================================
  // middleware/errorHandler.js
  // =============================================================================

  
  // =============================================================================
  // middleware/validation.js
  // =============================================================================
 
  
  // =============================================================================
  // routes/auth.js
  // =============================================================================
 
  
  // =============================================================================
  // routes/questions.js
  // =============================================================================
  
  
  // =============================================================================
  // routes/answers.js
  // =============================================================================
 
  
  // =============================================================================
  // routes/users.js
  // =============================================================================
  
  // =============================================================================
  // routes/tags.js
  // =============================================================================
  
  
  // =============================================================================
  // routes/notifications.js
  // =============================================================================
 
  // =============================================================================
  // routes/upload.js
  // =============================================================================

  // =============================================================================
  // routes/admin.js
  // =============================================================================
 