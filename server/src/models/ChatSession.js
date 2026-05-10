const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const chatSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        category: {
            type: String,
            enum: ['Frontend', 'Backend', 'AI', 'HR'],
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'completed'],
            default: 'active',
        },
        messages: [messageSchema],
        summary: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('ChatSession', chatSessionSchema);
