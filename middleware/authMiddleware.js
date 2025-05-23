const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');

/**
 * Middleware to protect routes that require authentication
 */
exports.protect = async (req, res, next) => {
  try {
    // 1) Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Please log in to access this resource' });
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // 3) Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'The user no longer exists' });
    }

    // 4) Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please log in to access this resource' });
  }
};

/**
 * Middleware to restrict access to certain roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

/**
 * Middleware to check if the user is a member of the workspace
 */
exports.isWorkspaceMember = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    
    if (!workspaceId) {
      return res.status(400).json({
        status: 'error',
        message: 'No workspace ID provided'
      });
    }
    
    const workspace = await Workspace.findById(workspaceId);
    
    if (!workspace) {
      return res.status(404).json({
        status: 'error',
        message: 'Workspace not found'
      });
    }
    
    // Check if user is a member of the workspace
    if (!workspace.isMember(req.user._id)) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not a member of this workspace'
      });
    }
    
    // Store the workspace and user's role in the request object
    req.workspace = workspace;
    req.userRole = workspace.getUserRole(req.user._id);
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if the user has required workspace role
 */
exports.hasWorkspaceRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.body.workspaceId;
      
      if (!workspaceId) {
        return res.status(400).json({
          status: 'error',
          message: 'No workspace ID provided'
        });
      }
      
      const workspace = await Workspace.findById(workspaceId);
      
      if (!workspace) {
        return res.status(404).json({
          status: 'error',
          message: 'Workspace not found'
        });
      }
      
      // Check if user has the required role
      if (!workspace.canPerformAction(req.user._id, requiredRole)) {
        return res.status(403).json({
          status: 'error',
          message: `You need ${requiredRole} role or higher to perform this action`
        });
      }
      
      // Store the workspace and user's role in the request object
      req.workspace = workspace;
      req.userRole = workspace.getUserRole(req.user._id);
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to refresh token if it's about to expire
 */
exports.refreshToken = async (req, res, next) => {
  try {
    // Only proceed if user is authenticated
    if (!req.user) return next();
    
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    
    if (!token) return next();
    
    const decoded = await promisify(jwt.verify)(
      token,
      process.env.JWT_SECRET,
      { ignoreExpiration: true }
    );
    
    // Calculate token expiry time
    const expiryTime = decoded.exp * 1000;
    const now = Date.now();
    
    // If token expires in less than 5 minutes, refresh it
    if (expiryTime - now < 5 * 60 * 1000) {
      const newToken = jwt.sign(
        { id: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );
      
      // Send the new token in the response
      res.set('Authorization', `Bearer ${newToken}`);
      
      // Also set cookie for browser clients
      if (req.cookies.jwt) {
        res.cookie('jwt', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: parseInt(process.env.JWT_EXPIRES_IN || '3600') * 1000
        });
      }
    }
    
    next();
  } catch (error) {
    next();
  }
}; 