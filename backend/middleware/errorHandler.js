const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
  
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
  
    // Validation errors
    if (err.isJoi) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: err.details.map(detail => detail.message)
      });
    }
  
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large'
      });
    }
  
    // Default error
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  };
  
  module.exports = errorHandler;