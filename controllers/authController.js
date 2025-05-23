const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

/**
 * Generate JWT token
 */
const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

/**
 * Generate refresh token
 */
const signRefreshToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

/**
 * Send JWT token response
 */
const createSendToken = (user, statusCode, req, res) => {
  // 1) Generate JWT token
  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  
  // 2) Save refresh token to database
  user.refreshToken = refreshToken;
  user.lastLogin = Date.now();
  user.failedLoginAttempts = 0;
  user.save({ validateBeforeSave: false });
  
  // 3) Set cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_EXPIRES_IN || '3600') * 1000
    ),
    httpOnly: true, // Cannot be accessed by client side JS
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };
  
  // 4) Set cookie
  res.cookie('jwt', token, cookieOptions);
  
  // 5) Remove sensitive data from output
  user.password = undefined;
  user.refreshToken = undefined;
  
  // 6) Send response
  res.status(statusCode).json({
    status: 'success',
    token,
    refreshToken,
    data: {
      user
    }
  });
};

/**
 * Register a new user
 */
exports.register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({
                message: 'Please provide email, password, and name'
            });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                message: 'User already exists'
            });
        }

        // Create new user
        user = await User.create({
            email,
            password,
            name
        });

        // Generate token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1d' }
        );

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            message: error.message || 'Registration failed'
        });
    }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Please provide email and password'
            });
        }
        
        // Find user
        const user = await User.findOne({ email });
        
        // Check if user exists
        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: error.message || 'Login failed'
        });
    }
};

/**
 * Logout user
 */
exports.logout = async (req, res) => {
  // 1) Clear JWT cookie
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  // 2) Send response
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

/**
 * Refresh token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }
    
    // 1) Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );
    
    // 2) Check if user still exists
    const user = await User.findById(decoded.id).select('+refreshToken');
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }
    
    // 3) Generate new tokens
    const newToken = signToken(user._id);
    const newRefreshToken = signRefreshToken(user._id);
    
    // 4) Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });
    
    // 5) Set cookie
    res.cookie('jwt', newToken, {
      expires: new Date(
        Date.now() + parseInt(process.env.JWT_EXPIRES_IN || '3600') * 1000
      ),
      httpOnly: true,
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
    });
    
    // 6) Send response
    res.status(200).json({
      status: 'success',
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token'
      });
    }
    
    next(error);
  }
};

/**
 * Forgot password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    // 1) Get user by email
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'There is no user with this email address'
      });
    }
    
    // 2) Generate random token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    
    // 3) Send token to user's email (simplified for now)
    // In a real application, you would send an email with the token
    
    // 4) Send response
    res.status(200).json({
      status: 'success',
      message: 'Password reset token sent to email',
      resetToken // In production, don't send this directly!
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    // 1) Get user based on token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.body.token)
      .digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    // 2) Check if token is valid and not expired
    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }
    
    // 3) Set new password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.accountLocked = false;
    user.failedLoginAttempts = 0;
    
    await user.save();
    
    // 4) Log the user in
    createSendToken(user, 200, req, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Update password
 */
exports.updatePassword = async (req, res, next) => {
  try {
    // 1) Get user from collection
    const user = await User.findById(req.user._id).select('+password');
    
    // 2) Check if current password is correct
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(401).json({
        status: 'error',
        message: 'Your current password is incorrect'
      });
    }
    
    // 3) Update password
    user.password = req.body.newPassword;
    await user.save();
    
    // 4) Log user in with new token
    createSendToken(user, 200, req, res);
  } catch (error) {
    next(error);
  }
}; 