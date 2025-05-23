const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema for both databases
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, {
    timestamps: true
});

async function mergeUsers() {
    try {
        // Connect to both databases using environment variables
        const planextraDB = await mongoose.createConnection(process.env.MONGODB_URI);
        const testDB = await mongoose.createConnection(process.env.TEST_MONGODB_URI);

        // Create models for both databases
        const PlanextraUser = planextraDB.model('User', userSchema);
        const TestUser = testDB.model('User', userSchema);

        // Get all users from test database
        const testUsers = await TestUser.find({});
        console.log(`Found ${testUsers.length} users in test database`);

        // Process each user
        for (const testUser of testUsers) {
            try {
                // Check if user already exists in planextra
                const existingUser = await PlanextraUser.findOne({ email: testUser.email });

                if (existingUser) {
                    console.log(`User ${testUser.email} already exists in planextra database`);
                    continue;
                }

                // Create new user in planextra with proper schema
                const newUser = new PlanextraUser({
                    name: testUser.name,
                    email: testUser.email,
                    password: testUser.password, // Password is already hashed
                    role: 'user',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                await newUser.save();
                console.log(`Successfully migrated user: ${testUser.email}`);
            } catch (error) {
                console.error(`Error processing user ${testUser.email}:`, error);
            }
        }

        console.log('Migration completed');

        // Close connections
        await planextraDB.close();
        await testDB.close();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
mergeUsers(); 