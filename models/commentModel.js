const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Comment must belong to a task']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Comment must belong to a user']
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Comment must belong to a workspace']
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for faster queries
commentSchema.index({ task: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ 'mentions': 1 });
commentSchema.index({ isDeleted: 1 });

// Update the updatedAt timestamp on document update
commentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // If the content was modified, mark as edited
  if (this.isModified('content') && this.createdAt.getTime() !== Date.now()) {
    this.isEdited = true;
  }
  
  next();
});

// Don't query deleted comments
commentSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Virtual populate for replies
commentSchema.virtual('replies', {
  ref: 'Comment',
  foreignField: 'parentComment',
  localField: '_id'
});

// Parse mentions from comment content
commentSchema.pre('save', async function(next) {
  if (!this.isModified('content')) return next();
  
  try {
    // Extract mentions (usernames starting with @)
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentionedUsernames = [...this.content.matchAll(mentionRegex)]
      .map(match => match[1]);
    
    if (mentionedUsernames.length > 0) {
      // Find mentioned users in database
      const User = mongoose.model('User');
      const mentionedUsers = await User.find({
        username: { $in: mentionedUsernames }
      });
      
      // Store the user IDs in the mentions array
      this.mentions = mentionedUsers.map(user => user._id);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment; 