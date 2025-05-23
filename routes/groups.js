const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

// Get all groups for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const groups = await Group.find({
            'members.user': req.user.userId
        }).populate('owner', 'name email')
          .populate('members.user', 'name email');
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching groups', error: error.message });
    }
});

// Create a new group
router.post('/', authenticateToken, async (req, res) => {
    try {
        // Check if user has reached the group limit
        const userGroups = await Group.find({
            $or: [
                { owner: req.user.userId },
                { 'members.user': req.user.userId }
            ]
        });

        if (userGroups.length >= 5) {
            return res.status(400).json({ message: 'You have reached the maximum number of groups (5)' });
        }

        const { name, description } = req.body;
        
        // Generate a unique invite code
        let inviteCode;
        let isUnique = false;
        while (!isUnique) {
            inviteCode = Group.generateInviteCode();
            const existingGroup = await Group.findOne({ inviteCode });
            if (!existingGroup) {
                isUnique = true;
            }
        }

        const group = new Group({
            name,
            description,
            inviteCode,
            owner: req.user.userId,
            members: [{
                user: req.user.userId,
                role: 'owner'
            }]
        });

        const savedGroup = await group.save();
        res.status(201).json(savedGroup);
    } catch (error) {
        res.status(400).json({ message: 'Error creating group', error: error.message });
    }
});

// Join a group using invite code
router.post('/join', authenticateToken, async (req, res) => {
    try {
        const { inviteCode } = req.body;

        // Check if user has reached the group limit
        const userGroups = await Group.find({
            $or: [
                { owner: req.user.userId },
                { 'members.user': req.user.userId }
            ]
        });

        if (userGroups.length >= 5) {
            return res.status(400).json({ message: 'You have reached the maximum number of groups (5)' });
        }

        const group = await Group.findOne({ inviteCode });
        
        if (!group) {
            return res.status(404).json({ message: 'Invalid invite code' });
        }

        // Check if user is already a member
        const isMember = group.members.some(member => 
            member.user.toString() === req.user.userId
        );

        if (isMember) {
            return res.status(400).json({ message: 'You are already a member of this group' });
        }

        group.members.push({
            user: req.user.userId,
            role: 'member'
        });

        await group.save();
        res.json({ message: 'Successfully joined the group', group });
    } catch (error) {
        res.status(400).json({ message: 'Error joining group', error: error.message });
    }
});

// Leave a group
router.post('/:id/leave', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user is the owner
        if (group.owner.toString() === req.user.userId) {
            return res.status(400).json({ message: 'Group owner cannot leave. Please delete the group instead.' });
        }

        // Remove user from members
        group.members = group.members.filter(member => 
            member.user.toString() !== req.user.userId
        );

        await group.save();
        res.json({ message: 'Successfully left the group' });
    } catch (error) {
        res.status(400).json({ message: 'Error leaving group', error: error.message });
    }
});

// Delete a group (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });
        
        if (!group) {
            return res.status(404).json({ message: 'Group not found or you are not the owner' });
        }

        await group.remove();
        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting group', error: error.message });
    }
});

// Get group details
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findOne({
            _id: req.params.id,
            'members.user': req.user.userId
        }).populate('owner', 'name email')
          .populate('members.user', 'name email');
        
        if (!group) {
            return res.status(404).json({ message: 'Group not found or you are not a member' });
        }

        res.json(group);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching group details', error: error.message });
    }
});

// Update group details (owner only)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;
        const group = await Group.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });
        
        if (!group) {
            return res.status(404).json({ message: 'Group not found or you are not the owner' });
        }

        group.name = name || group.name;
        group.description = description || group.description;
        
        const updatedGroup = await group.save();
        res.json(updatedGroup);
    } catch (error) {
        res.status(400).json({ message: 'Error updating group', error: error.message });
    }
});

// Generate new invite code (owner only)
router.post('/:id/new-invite-code', authenticateToken, async (req, res) => {
    try {
        const group = await Group.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });
        
        if (!group) {
            return res.status(404).json({ message: 'Group not found or you are not the owner' });
        }

        // Generate a new unique invite code
        let newInviteCode;
        let isUnique = false;
        while (!isUnique) {
            newInviteCode = Group.generateInviteCode();
            const existingGroup = await Group.findOne({ inviteCode: newInviteCode });
            if (!existingGroup) {
                isUnique = true;
            }
        }

        group.inviteCode = newInviteCode;
        await group.save();
        
        res.json({ inviteCode: newInviteCode });
    } catch (error) {
        res.status(400).json({ message: 'Error generating new invite code', error: error.message });
    }
});

module.exports = router; 