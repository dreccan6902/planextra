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

async function resetPassword() {
    try {
        // Connect to the database
        await mongoose.connect(config.mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('Connected to MongoDB');

        // Find the user
        const user = await User.findOne({ email: 'admin1@gmail.com' });
        
        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        // Set new password
        const newPassword = 'test123'; // You can change this password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update the user's password
        await User.updateOne(
            { email: 'admin1@gmail.com' },
            { 
                $set: { 
                    password: hashedPassword,
                    updatedAt: new Date()
                }
            }
        );

        console.log('Password has been reset successfully');
        console.log('New password is:', newPassword);
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetPassword(); 