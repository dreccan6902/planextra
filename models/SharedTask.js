const mongoose = require('mongoose');

const sharedTaskSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['mustdo', 'extrathings', 'startedwork', 'almostdone', 'finished']
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

sharedTaskSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const SharedTask = mongoose.model('SharedTask', sharedTaskSchema);
module.exports = SharedTask; 