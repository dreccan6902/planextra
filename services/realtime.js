const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const config = require('../config/config');

class RealtimeService {
    constructor(server) {
        this.io = socketIo(server, {
            cors: {
                origin: process.env.CLIENT_URL || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        this.workspaceUsers = new Map(); // workspaceId -> Set of user IDs
        this.userSockets = new Map(); // userId -> Set of socket IDs

        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication error'));
                }

                const decoded = jwt.verify(token, config.jwtSecret);
                const user = await User.findById(decoded.id);
                if (!user) {
                    return next(new Error('User not found'));
                }

                socket.user = user;
                next();
            } catch (error) {
                next(new Error('Authentication error'));
            }
        });

        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
            this.handleWorkspaceEvents(socket);
            this.handleDisconnection(socket);
        });
    }

    handleConnection(socket) {
        const userId = socket.user._id;
        
        // Track user's sockets
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socket.id);

        // Update user's online status
        this.updateUserStatus(userId, true);
    }

    handleWorkspaceEvents(socket) {
        socket.on('join-workspace', async (workspaceId) => {
            try {
                const workspace = await Workspace.findById(workspaceId);
                if (!workspace || !workspace.hasPermission(socket.user._id, 'viewer')) {
                    socket.emit('error', { message: 'Access denied' });
                    return;
                }

                socket.join(workspaceId);
                
                // Track workspace presence
                if (!this.workspaceUsers.has(workspaceId)) {
                    this.workspaceUsers.set(workspaceId, new Set());
                }
                this.workspaceUsers.get(workspaceId).add(socket.user._id);

                // Broadcast user presence to workspace
                this.broadcastWorkspacePresence(workspaceId);
            } catch (error) {
                socket.emit('error', { message: 'Failed to join workspace' });
            }
        });

        socket.on('leave-workspace', (workspaceId) => {
            socket.leave(workspaceId);
            
            // Update workspace presence
            const workspaceUsers = this.workspaceUsers.get(workspaceId);
            if (workspaceUsers) {
                workspaceUsers.delete(socket.user._id);
                this.broadcastWorkspacePresence(workspaceId);
            }
        });

        // Handle real-time task updates
        socket.on('task-update', (data) => {
            socket.to(data.workspaceId).emit('task-updated', {
                taskId: data.taskId,
                changes: data.changes,
                updatedBy: socket.user._id
            });
        });

        // Handle cursor position updates
        socket.on('cursor-move', (data) => {
            socket.to(data.workspaceId).emit('cursor-moved', {
                userId: socket.user._id,
                position: data.position
            });
        });
    }

    handleDisconnection(socket) {
        socket.on('disconnect', () => {
            const userId = socket.user._id;
            
            // Remove socket from tracking
            const userSockets = this.userSockets.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                
                // If user has no more active sockets, update status to offline
                if (userSockets.size === 0) {
                    this.updateUserStatus(userId, false);
                    this.userSockets.delete(userId);
                }
            }

            // Remove user from all workspace presence lists
            this.workspaceUsers.forEach((users, workspaceId) => {
                if (users.has(userId)) {
                    users.delete(userId);
                    this.broadcastWorkspacePresence(workspaceId);
                }
            });
        });
    }

    async updateUserStatus(userId, isOnline) {
        try {
            await User.findByIdAndUpdate(userId, { 
                isOnline,
                lastActive: new Date()
            });
        } catch (error) {
            console.error('Failed to update user status:', error);
        }
    }

    broadcastWorkspacePresence(workspaceId) {
        const users = Array.from(this.workspaceUsers.get(workspaceId) || []);
        this.io.to(workspaceId).emit('presence-update', { users });
    }
}

module.exports = RealtimeService; 