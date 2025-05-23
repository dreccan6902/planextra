const express = require('express');
const router = express.Router();
const SharedTask = require('../models/SharedTask');
const Group = require('../models/Group');
const authenticateToken = require('../middleware/auth');

// Get all tasks for a group
router.get('/group/:groupId', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching tasks for group:', req.params.groupId);
        
        // Check if user is a member of the group
        const group = await Group.findOne({
            _id: req.params.groupId,
            'members.user': req.user.userId
        });

        if (!group) {
            return res.status(403).json({ message: 'Access denied: Not a member of this group' });
        }

        console.log('Found group:', group);

        const tasks = await SharedTask.find({ group: req.params.groupId })
            .populate('createdBy', 'name email')
            .populate('assignedTo', 'name email')
            .populate('lastModifiedBy', 'name email')
            .sort({ createdAt: -1 });
            
        console.log('Found tasks:', tasks);
        res.json(tasks);
    } catch (error) {
        console.error('Error in GET /group/:groupId:', error);
        res.status(500).json({ message: 'Error fetching tasks', error: error.message });
    }
});

// Create a new task in a group
router.post('/group/:groupId', authenticateToken, async (req, res) => {
    try {
        console.log('Creating task with data:', {
            body: req.body,
            groupId: req.params.groupId,
            userId: req.user.userId
        });
        
        // Check if user is a member of the group
        const group = await Group.findOne({
            _id: req.params.groupId,
            'members.user': req.user.userId
        });

        if (!group) {
            return res.status(403).json({ message: 'Access denied: Not a member of this group' });
        }

        console.log('Found group:', group);

        const taskData = {
            text: req.body.text,
            category: req.body.category,
            group: req.params.groupId,
            createdBy: req.user.userId,
            lastModifiedBy: req.user.userId,
            assignedTo: req.body.assignedTo || []
        };

        console.log('Creating task with:', taskData);
        
        // Verify SharedTask model is available
        console.log('SharedTask model:', typeof SharedTask, SharedTask);
        
        const task = new SharedTask(taskData);
        console.log('Created task instance:', task);
        
        const savedTask = await task.save();
        console.log('Saved task:', savedTask);
        
        const populatedTask = await SharedTask.findById(savedTask._id)
            .populate('createdBy', 'name email')
            .populate('assignedTo', 'name email')
            .populate('lastModifiedBy', 'name email');

        // Emit socket event for real-time updates
        if (req.app.get('io')) {
            req.app.get('io').to(req.params.groupId).emit('taskCreated', populatedTask);
        }

        res.status(201).json(populatedTask);
    } catch (error) {
        console.error('Error in POST /group/:groupId:', error);
        res.status(400).json({ message: 'Error creating task', error: error.message });
    }
});

// Update a task in a group
router.put('/group/:groupId/task/:taskId', authenticateToken, async (req, res) => {
    try {
        // Check if user is a member of the group
        const group = await Group.findOne({
            _id: req.params.groupId,
            'members.user': req.user.userId
        });

        if (!group) {
            return res.status(403).json({ message: 'Access denied: Not a member of this group' });
        }

        const task = await SharedTask.findOne({
            _id: req.params.taskId,
            group: req.params.groupId
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (req.body.text) task.text = req.body.text;
        if (req.body.category) task.category = req.body.category;
        if (req.body.assignedTo) task.assignedTo = req.body.assignedTo;
        task.lastModifiedBy = req.user.userId;

        const updatedTask = await task.save();
        const populatedTask = await SharedTask.findById(updatedTask._id)
            .populate('createdBy', 'name email')
            .populate('assignedTo', 'name email')
            .populate('lastModifiedBy', 'name email');

        // Emit socket event for real-time updates
        if (req.app.get('io')) {
            req.app.get('io').to(req.params.groupId).emit('taskUpdated', populatedTask);
        }

        res.json(populatedTask);
    } catch (error) {
        console.error('Error in PUT /group/:groupId/task/:taskId:', error);
        res.status(400).json({ message: 'Error updating task', error: error.message });
    }
});

// Delete a task from a group
router.delete('/group/:groupId/task/:taskId', authenticateToken, async (req, res) => {
    try {
        // Check if user is a member of the group
        const group = await Group.findOne({
            _id: req.params.groupId,
            'members.user': req.user.userId
        });

        if (!group) {
            return res.status(403).json({ message: 'Access denied: Not a member of this group' });
        }

        const task = await SharedTask.findOneAndDelete({
            _id: req.params.taskId,
            group: req.params.groupId
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Emit socket event for real-time updates
        if (req.app.get('io')) {
            req.app.get('io').to(req.params.groupId).emit('taskDeleted', task._id);
        }

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error in DELETE /group/:groupId/task/:taskId:', error);
        res.status(400).json({ message: 'Error deleting task', error: error.message });
    }
});

module.exports = router; 