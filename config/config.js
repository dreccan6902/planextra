// Environment configuration without dotenv
module.exports = {
    mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/planextra',
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongooseOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        strictQuery: false
    }
}; 