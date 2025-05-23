const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { userValidation, validate, sanitizeMongoId } = require('../middleware/validationMiddleware');

const router = express.Router();

// All routes below this middleware are protected
router.use(protect);

// User routes for current user
router.get('/me', userController.getMe);
router.patch(
  '/me',
  userValidation.updateProfile,
  validate,
  userController.updateMe
);
router.delete('/me', userController.deleteMe);

// Admin only routes
router.use(restrictTo('admin'));

router.get('/', userController.getAllUsers);

router.route('/:id')
  .get(sanitizeMongoId('id'), validate, userController.getUser)
  .patch(
    sanitizeMongoId('id'),
    userValidation.updateProfile,
    validate,
    userController.updateUser
  )
  .delete(sanitizeMongoId('id'), validate, userController.deleteUser);

module.exports = router; 