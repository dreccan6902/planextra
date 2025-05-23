const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    },
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    isEdited: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Parse @mentions from comment content
commentSchema.pre('save', async function(next) {
    if (this.isModified('content')) {
        const mentionPattern = /@(\w+)/g;
        const mentions = this.content.match(mentionPattern) || [];
        
        if (mentions.length > 0) {
            const User = mongoose.model('User');
            const usernames = mentions.map(mention => mention.substring(1));
            const mentionedUsers = await User.find({ 
                username: { $in: usernames } 
            });
            
            this.mentions = mentionedUsers.map(user => user._id);
        }
    }
    next();
});

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment; 