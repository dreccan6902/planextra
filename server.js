// CORS Configuration
app.use((req, res, next) => {
    const allowedOrigins = ['https://cerulean-basbousa-18f229.netlify.app'];
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
        origin: 'https://cerulean-basbousa-18f229.netlify.app',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    path: '/socket.io/',
    pingTimeout: 60000,
    pingInterval: 25000
});

// Root route
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'PlanExtra API Server',
        version: '1.0.0',
        frontend: 'https://cerulean-basbousa-18f229.netlify.app'
    });
}); 