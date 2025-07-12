const Joi = require('joi');
  
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Validation schemas
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    username: Joi.string().min(3).max(30).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  question: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    content: Joi.string().min(10).required(),
    tags: Joi.array().items(Joi.string()).min(1).max(5).required()
  }),

  answer: Joi.object({
    content: Joi.string().min(10).required()
  }),

  vote: Joi.object({
    type: Joi.string().valid('upvote', 'downvote').required()
  })
};

module.exports = { validate, schemas };