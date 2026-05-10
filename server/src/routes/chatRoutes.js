const express = require('express');
const ChatSession = require('../models/ChatSession');
const protectRoute = require('../middleware/authMiddleware');
const { generateInterviewReply } = require('../services/openaiService');
const { generateSessionSummary } = require('../services/openaiService');

const router = express.Router();

const allowedCategories = ['Frontend', 'Backend', 'AI', 'HR'];

router.get('/sessions', protectRoute, async (req, res) => {
    try {
        const sessions = await ChatSession.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        return res.json({ sessions });
    } catch (error) {
        return res.status(500).json({ message: 'Could not load chat sessions.', error: error.message });
    }
});

router.get('/sessions/:sessionId', protectRoute, async (req, res) => {
    try {
        const session = await ChatSession.findOne({ _id: req.params.sessionId, userId: req.user.id });

        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        return res.json({ session });
    } catch (error) {
        return res.status(500).json({ message: 'Could not load session.', error: error.message });
    }
});

router.post('/sessions', protectRoute, async (req, res) => {
    try {
        const { category } = req.body;

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({ message: 'Please choose a valid category.' });
        }

        const session = await ChatSession.create({
            userId: req.user.id,
            category,
            messages: [
                {
                    role: 'assistant',
                    content: `Welcome to your ${category} interview practice. Tell me about yourself to begin.`,
                },
            ],
            summary: `Started a ${category} interview practice session.`,
        });

        return res.status(201).json({ session });
    } catch (error) {
        return res.status(500).json({ message: 'Could not create session.', error: error.message });
    }
});

router.post('/sessions/:sessionId/message', protectRoute, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message is required.' });
        }

        const session = await ChatSession.findOne({ _id: req.params.sessionId, userId: req.user.id });
        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        // prevent posting to a completed session
        if (session.status && session.status === 'completed') {
            return res.status(400).json({ message: 'This interview has ended. Start a new session to continue practicing.' });
        }

        session.messages.push({ role: 'user', content: message });

        const aiReply = await generateInterviewReply({
            category: session.category,
            messages: session.messages.map((chatMessage) => ({
                role: chatMessage.role,
                content: chatMessage.content,
            })),
        });

        session.messages.push({ role: 'assistant', content: aiReply.reply });
        session.summary = `Chat session updated for ${session.category}.`;

        await session.save();

        return res.json({
            session,
            assistantMessage: aiReply.reply,
            assistantEvaluation: aiReply.evaluation || null,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Could not send message.', error: error.message });
    }
});

router.post('/sessions/:sessionId/end', protectRoute, async (req, res) => {
    try {
        const session = await ChatSession.findOne({ _id: req.params.sessionId, userId: req.user.id });
        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        const result = await generateSessionSummary({ category: session.category, messages: session.messages.map((m) => ({ role: m.role, content: m.content })) });

        // append final assistant message and mark session completed
        session.messages.push({ role: 'assistant', content: result.finalMessage });
        session.summary = result.summary;
        session.status = 'completed';

        await session.save();

        return res.json({ session, finalMessage: result.finalMessage, evaluation: result.evaluation || null });
    } catch (error) {
        return res.status(500).json({ message: 'Could not finalize session.', error: error.message });
    }
});

module.exports = router;
