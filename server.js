const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const config = require('./config/config');
const taskRoutes = require('./routes/tasks');
const groupRoutes = require('./routes/groups');
const sharedTaskRoutes = require('./routes/sharedTasks');
const Task = require('./models/Task');
const SharedTask = require('./models/SharedTask');
const User = require('./models/User');

// Configure mongoose
mongoose.set('strictQuery', false);

const app = express();
const server = http.createServer(app);

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Headers:', req.headers);
    next();
});

// Basic middleware
app.use(express.json());

// CORS Configuration
app.use((req, res, next) => {
    const allowedOrigins = ['https://melodic-lebkuchen-a42cba.netlify.app'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    // Allow credentials
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Allow specific methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Allow specific headers
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Set max age for preflight requests
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    next();
});

// Socket.IO setup with CORS
const io = socketIo(server, {
    cors: {
        origin: 'https://heroic-figolla-87d8e9.netlify.app',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    path: '/socket.io/',
    pingTimeout: 60000,
    pingInterval: 25000
});

// Initialize routes
const initializeRoutes = () => {
    app.set('io', io);
    
    // Test route to verify CORS
    app.get('/test', (req, res) => {
        res.json({ message: 'CORS test successful' });
    });

    // API routes with /api prefix
    app.use('/api/tasks', taskRoutes);
    app.use('/api/groups', groupRoutes);
    app.use('/api/shared-tasks', sharedTaskRoutes);

    // Root route
    app.get('/', (req, res) => {
        res.json({
            status: 'ok',
            message: 'PlanExtra API Server',
            version: '1.0.0',
            frontend: 'https://heroic-figolla-87d8e9.netlify.app'
        });
    });
};

// MongoDB connection
async function startServer() {
    try {
        await mongoose.connect(config.mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('Connected to MongoDB Atlas successfully');
        initializeRoutes();
        
        // Socket.IO auth
        io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                socket.user = decoded;
                next();
            } catch (error) {
                next(new Error('Authentication error'));
            }
        });

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    if (req.path.startsWith('/auth/')) {
        return next();
    }

    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Authentication Routes
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt details:', { 
            email,
            hasPassword: !!password,
            passwordLength: password?.length
        });

        if (!email || !password) {
            console.log('Missing credentials:', { email: !!email, password: !!password });
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user and explicitly select password field
        const user = await User.findOne({ email }).select('+password');
        console.log('User lookup result:', {
            found: !!user,
            userId: user?._id,
            hasPasswordHash: !!user?.password
        });

        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password validation:', {
            isValid: validPassword,
            providedLength: password.length,
            hashLength: user.password.length
        });

        if (!validPassword) {
            console.log('Invalid password for user:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Create token with all necessary user information
        const tokenPayload = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        const token = jwt.sign(
            tokenPayload,
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        user.password = undefined;

        // Set token in cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: true, // Force secure for all environments
            sameSite: 'none',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Set authorization header
        res.setHeader('Authorization', `Bearer ${token}`);

        console.log('Login successful - Sending response:', {
            userId: user._id,
            email: user.email,
            tokenLength: token.length,
            tokenPreview: token.substring(0, 10) + '...',
            cookieSet: true,
            headerSet: true
        });

        // Send response with token and user data
        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Token verification endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ 
        valid: true,
        user: req.user 
    });
});

app.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        console.log('Registration attempt:', { 
            name, 
            email, 
            hasPassword: !!password,
            passwordLength: password?.length 
        });
        
        if (!name || !email || !password) {
            console.log('Missing registration fields:', {
                name: !!name,
                email: !!email,
                password: !!password
            });
            return res.status(400).json({ message: 'All fields are required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('Invalid email format:', email);
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        const user = new User({
            name,
            email,
            password,
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Log the user object before saving (without password)
        console.log('Creating new user:', {
            name: user.name,
            email: user.email,
            role: user.role
        });

        await user.save();
        console.log('User saved successfully:', user._id);

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

// Track active users with multiple connections per user
const activeUsers = new Map(); // userId -> { user data }
const userSockets = new Map(); // userId -> Set of socket IDs

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    // Add user to active users
    activeUsers.set(socket.user.userId, {
        id: socket.user.userId,
        name: socket.user.name,
        socketId: socket.id
    });
    
    // Send initial active users list to the newly connected user
    socket.emit('activeUsers', Array.from(activeUsers.values()));

    // Handle request for active users list
    socket.on('requestActiveUsers', () => {
        socket.emit('activeUsers', Array.from(activeUsers.values()));
    });

    // Join group room
    socket.on('joinGroup', (groupId) => {
        socket.join(groupId);
        console.log(`${socket.user.name} joined group ${groupId}`);
        
        // Broadcast active users to the group
        io.to(groupId).emit('activeUsers', Array.from(activeUsers.values()));
    });

    // Handle task events
    socket.on('addTask', async (data) => {
        try {
            const task = new Task({
                text: data.text,
                category: data.category,
                createdBy: socket.user.userId
            });
            await task.save();
            socket.broadcast.emit('taskAdded', task);
        } catch (error) {
            console.error('Error adding task:', error);
        }
    });

    socket.on('updateTask', async (data) => {
        try {
            const task = await Task.findOneAndUpdate(
                { _id: data.taskId, createdBy: socket.user.userId },
                { category: data.newCategory },
                { new: true }
            );
            if (task) {
                socket.broadcast.emit('taskUpdated', task);
            }
        } catch (error) {
            console.error('Error updating task:', error);
        }
    });

    socket.on('deleteTask', async (data) => {
        try {
            const task = await Task.findOneAndDelete({
                _id: data.taskId,
                createdBy: socket.user.userId
            });
            if (task) {
                socket.broadcast.emit('taskDeleted', data.taskId);
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    });
});

// Start the server
startServer(); 