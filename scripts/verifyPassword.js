const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

async function verifyPassword() {
    try {
        // Connect to the database
        await mongoose.connect(config.mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('Connected to MongoDB');

        // Find the user
        const user = await User.findOne({ email: 'admin5@gmail.com' });
        
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        console.log('Found user:', {
            email: user.email,
            passwordHash: user.password
        });

        // Test the password
        const testPassword = 'admin5';
        const isMatch = await bcrypt.compare(testPassword, user.password);
        
        console.log('\nTesting password verification:');
        console.log('Password being tested:', testPassword);
        console.log('Password hash in DB:', user.password);
        console.log('Password matches:', isMatch);

        // Let's also generate a new hash with the same password to compare formats
        const newHash = await bcrypt.hash(testPassword, 10);
        console.log('\nGenerating new hash with same password:');
        console.log('New hash generated:', newHash);
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyPassword(); 