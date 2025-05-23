# PlanExtra Secure Backend

This is the backend server for PlanExtra, a collaborative task management application. It's built with security, performance, and scalability in mind.

## Features

- **Secure Authentication System**
  - JWT-based authentication with refresh tokens
  - Password reset functionality
  - Account locking after failed login attempts
  - Password encryption with bcrypt

- **Role-Based Access Control**
  - User roles (admin, user)
  - Workspace-specific permissions (owner, admin, editor, viewer)

- **Data Security**
  - Input validation and sanitization
  - XSS protection
  - CSRF protection
  - Rate limiting

- **Real-Time Collaboration**
  - WebSocket support for live updates
  - Task comments with mentions
  - Activity tracking

- **Scalable Architecture**
  - MongoDB database
  - Modular code structure
  - Extensive error handling
  - Logging system

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:
   ```
   npm install
   ```
4. Create an `.env` file based on the example:
   ```
   NODE_ENV=development
   PORT=5000
   API_VERSION=v1

   # Database Configuration
   MONGO_URI=mongodb://localhost:27017/planextra
   MONGO_USER=your_mongodb_username
   MONGO_PASSWORD=your_mongodb_password

   # Authentication
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=1h
   JWT_REFRESH_SECRET=your_refresh_token_secret
   JWT_REFRESH_EXPIRES_IN=7d

   # Security
   CORS_ORIGIN=http://localhost:3000
   RATE_LIMIT_WINDOW_MS=15
   RATE_LIMIT_MAX=100

   # Logging
   LOG_LEVEL=debug
   ```
5. Start the development server:
   ```
   npm run dev
   ```

## API Documentation

### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Log in a user
- `POST /api/v1/auth/logout` - Log out a user
- `POST /api/v1/auth/refresh-token` - Refresh JWT token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token
- `PATCH /api/v1/auth/update-password` - Update password (authenticated)

### Users

- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me` - Update current user profile
- `DELETE /api/v1/users/me` - Delete current user (soft delete)
- `GET /api/v1/users` - Get all users (admin only)
- `GET /api/v1/users/:id` - Get user by ID (admin only)
- `PATCH /api/v1/users/:id` - Update user (admin only)
- `DELETE /api/v1/users/:id` - Delete user (admin only)

### Workspaces

- `POST /api/v1/workspaces` - Create a new workspace
- `GET /api/v1/workspaces` - Get all workspaces for current user
- `GET /api/v1/workspaces/:id` - Get workspace by ID
- `PATCH /api/v1/workspaces/:id` - Update workspace
- `DELETE /api/v1/workspaces/:id` - Delete workspace
- `POST /api/v1/workspaces/:id/members` - Add member to workspace
- `DELETE /api/v1/workspaces/:id/members/:userId` - Remove member from workspace
- `PATCH /api/v1/workspaces/:id/members/:userId` - Update member role

### Tasks

- `POST /api/v1/tasks` - Create a new task
- `GET /api/v1/tasks` - Get all tasks for current user
- `GET /api/v1/workspaces/:id/tasks` - Get all tasks in a workspace
- `GET /api/v1/tasks/:id` - Get task by ID
- `PATCH /api/v1/tasks/:id` - Update task
- `DELETE /api/v1/tasks/:id` - Delete task

### Comments

- `POST /api/v1/comments` - Create a new comment
- `GET /api/v1/tasks/:id/comments` - Get all comments for a task
- `PATCH /api/v1/comments/:id` - Update comment
- `DELETE /api/v1/comments/:id` - Delete comment

## Security Features

### Authentication and Authorization

- Secure JWT implementation with short expiration times
- Refresh token rotation for improved security
- Password stored using bcrypt with salt
- Account locking after multiple failed login attempts
- Token invalidation on password change
- Role-based access control at user and workspace levels

### Data Protection

- Input validation using express-validator
- XSS protection with xss-clean
- HTTP security headers with helmet
- CORS protection
- Rate limiting to prevent brute force attacks
- Dependency security scanning
- Request size limiting

### Logging and Monitoring

- Comprehensive logging with Winston
- Error tracking with stack traces in development
- Sanitized error messages in production
- HTTP request logging with Morgan
- Unhandled exception and rejection handling

## Project Structure

```
backend/
├── config/             # Configuration files
├── controllers/        # Route controllers
├── middleware/         # Custom middleware
├── models/             # Database models
├── routes/             # API routes
├── utils/              # Utility functions
├── logs/               # Application logs
├── tests/              # Test files
├── server.js           # Entry point
└── package.json        # Dependencies
```

## Development

### Testing

Run tests with:
```
npm test
```

### Linting

Run linting checks with:
```
npm run lint
```

## Deployment

For production deployment:

1. Set appropriate environment variables
2. Build the application:
   ```
   npm run build
   ```
3. Start the production server:
   ```
   npm start
   ```

## Security Best Practices

1. Keep dependencies updated to address vulnerabilities
2. Use secrets management for sensitive data
3. Implement proper input validation
4. Use HTTPS in production
5. Implement appropriate rate limiting
6. Use secure HTTP headers
7. Sanitize user inputs and database queries
8. Validate file uploads carefully
9. Implement proper error handling
10. Regularly perform security audits

## License

This project is licensed under the MIT License. 