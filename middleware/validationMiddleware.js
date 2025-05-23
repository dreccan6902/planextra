const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Middleware to check validation results
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));
    
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: extractedErrors
    });
  }
  
  next();
};

/**
 * Validation rules for authentication
 */
exports.authValidation = {
  register: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .trim()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
  ],
  
  login: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
  ],
  
  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Token is required'),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  
  updatePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ]
};

/**
 * Validation rules for user operations
 */
exports.userValidation = {
  updateProfile: [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores')
      .escape(),
    
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
  ]
};

/**
 * Validation rules for task operations
 */
exports.taskValidation = {
  createTask: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Task title must be between 3 and 100 characters')
      .escape(),
    
    body('category')
      .isIn(['mustdo', 'extrathings', 'startedwork', 'almostdone', 'finished'])
      .withMessage('Invalid task category'),
    
    body('workspace')
      .notEmpty()
      .withMessage('Workspace ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid workspace ID'),
    
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date'),
    
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
      .escape()
  ],
  
  updateTask: [
    param('id')
      .custom(value => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid task ID'),
    
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Task title must be between 3 and 100 characters')
      .escape(),
    
    body('category')
      .optional()
      .isIn(['mustdo', 'extrathings', 'startedwork', 'almostdone', 'finished'])
      .withMessage('Invalid task category'),
    
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date'),
    
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
      .escape()
  ]
};

/**
 * Validation rules for workspace operations
 */
exports.workspaceValidation = {
  createWorkspace: [
    body('name')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Workspace name must be between 3 and 50 characters')
      .escape(),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Description cannot exceed 200 characters')
      .escape(),
    
    body('isPrivate')
      .optional()
      .isBoolean()
      .withMessage('isPrivate must be a boolean'),
    
    body('colorScheme')
      .optional()
      .isIn(['default', 'ocean-night', 'earth'])
      .withMessage('Invalid color scheme')
  ],
  
  updateWorkspace: [
    param('id')
      .custom(value => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid workspace ID'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Workspace name must be between 3 and 50 characters')
      .escape(),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Description cannot exceed 200 characters')
      .escape(),
    
    body('isPrivate')
      .optional()
      .isBoolean()
      .withMessage('isPrivate must be a boolean'),
    
    body('colorScheme')
      .optional()
      .isIn(['default', 'ocean-night', 'earth'])
      .withMessage('Invalid color scheme')
  ],
  
  addMember: [
    param('id')
      .custom(value => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid workspace ID'),
    
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('role')
      .isIn(['admin', 'editor', 'viewer'])
      .withMessage('Role must be admin, editor, or viewer')
  ]
};

/**
 * Validation rules for comment operations
 */
exports.commentValidation = {
  createComment: [
    body('content')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Comment must be between 1 and 500 characters')
      .escape(),
    
    body('task')
      .notEmpty()
      .withMessage('Task ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid task ID'),
    
    body('workspace')
      .notEmpty()
      .withMessage('Workspace ID is required')
      .custom(value => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid workspace ID'),
    
    body('parentComment')
      .optional()
      .custom(value => value === null || mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid parent comment ID')
  ],
  
  updateComment: [
    param('id')
      .custom(value => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid comment ID'),
    
    body('content')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Comment must be between 1 and 500 characters')
      .escape()
  ]
};

/**
 * Middleware to sanitize MongoDB IDs
 */
exports.sanitizeMongoId = param => {
  return param('id')
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid ID format');
}; 