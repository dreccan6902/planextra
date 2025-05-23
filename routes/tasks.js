const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const authenticateToken = require('../middleware/auth');

// Get all tasks for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const tasks = await Task.find({ createdBy: req.user.userId });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tasks', error: error.message });
    }
});

// Create a new task
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { text, category } = req.body;
        const task = new Task({
            text,
            category,
            createdBy: req.user.userId
        });
        const savedTask = await task.save();
        res.status(201).json(savedTask);
    } catch (error) {
        res.status(400).json({ message: 'Error creating task', error: error.message });
    }
});

// Update a task
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { text, category } = req.body;
        const task = await Task.findOne({ _id: req.params.id, createdBy: req.user.userId });
        
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        task.text = text || task.text;
        task.category = category || task.category;
        const updatedTask = await task.save();
        
        res.json(updatedTask);
    } catch (error) {
        res.status(400).json({ message: 'Error updating task', error: error.message });
    }
});

// Delete a task
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, createdBy: req.user.userId });
        
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting task', error: error.message });
    }
});

// Delete multiple tasks
router.post('/delete-multiple', authenticateToken, async (req, res) => {
    try {
        const { taskIds } = req.body;
        const result = await Task.deleteMany({
            _id: { $in: taskIds },
            createdBy: req.user.userId
        });
        
        res.json({ message: `${result.deletedCount} tasks deleted successfully` });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting tasks', error: error.message });
    }
});

module.exports = router; 