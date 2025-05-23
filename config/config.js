// Environment configuration without dotenv
module.exports = {
    mongoURI: process.env.MONGODB_URI || 'mongodb+srv://drecxylover:tdTWv9IX4twWjYUF@cluster0.dcmqkxq.mongodb.net/planextra?retryWrites=true&w=majority&appName=Cluster0',
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongooseOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        strictQuery: false
    }
}; 