const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [3, 'Task title must be at least 3 characters'],
    maxlength: [100, 'Task title cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Task category is required'],
    enum: ['mustdo', 'extrathings', 'startedwork', 'almostdone', 'finished'],
    default: 'mustdo'
  },
  position: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Task must belong to a user']
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Task must belong to a workspace']
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dueDate: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  tags: [String],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
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

// Create compound index for better query performance
taskSchema.index({ createdBy: 1, workspace: 1, category: 1 });
taskSchema.index({ isDeleted: 1 });

// Update the updatedAt timestamp on document update
taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Don't query deleted tasks
taskSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Virtual populate for comments
taskSchema.virtual('comments', {
  ref: 'Comment',
  foreignField: 'task',
  localField: '_id'
});

// Virtual for remaining time until due date
taskSchema.virtual('timeRemaining').get(function() {
  if (!this.dueDate) return null;
  
  const now = new Date();
  const diff = this.dueDate - now;
  
  // Return null if due date has passed
  if (diff < 0) return null;
  
  // Return time remaining in milliseconds
  return diff;
});

// Instance method to check if task is overdue
taskSchema.methods.isOverdue = function() {
  if (!this.dueDate) return false;
  return new Date() > this.dueDate;
};

const Task = mongoose.model('Task', taskSchema);

module.exports = Task; 