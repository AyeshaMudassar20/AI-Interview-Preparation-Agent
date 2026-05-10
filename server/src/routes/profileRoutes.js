const express = require('express');
const protectRoute = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

router.get('/me', protectRoute, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('name email createdAt');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        return res.json({ user });
    } catch (error) {
        return res.status(500).json({ message: 'Could not load profile.', error: error.message });
    }
});

module.exports = router;
