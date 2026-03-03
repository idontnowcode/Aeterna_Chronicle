const express = require('express');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

function issueToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register
router.post('/register', [
  body('username').trim().isLength({ min: 2, max: 20 }).withMessage('이름은 2~20자'),
  body('email').isEmail().withMessage('유효한 이메일 필요'),
  body('password').isLength({ min: 8 }).withMessage('비밀번호 8자 이상'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { username, email, password } = req.body;
    const user = await User.create({ username, email, password });
    const token = issueToken(user._id);
    res.status(201).json({ token, userId: user._id });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({ error: `${field}_ALREADY_EXISTS` });
    }
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = issueToken(user._id);
    res.json({ token, userId: user._id });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

module.exports = router;
