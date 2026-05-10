const mongoose = require('mongoose');

async function connectDB(mongoUri) {
    if (!mongoUri) {
        throw new Error('MONGODB_URI is missing');
    }

    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
}

module.exports = connectDB;
