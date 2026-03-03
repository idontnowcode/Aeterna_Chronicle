const express = require('express');
const { body, validationResult } = require('express-validator');
const auth      = require('../middleware/auth');
const Character = require('../models/Character');
const User      = require('../models/User');
const { calcOfflineRewards } = require('../systems/offline');
const { ATTRIBUTES } = require('../data/attributes');

const router = express.Router();
router.use(auth);

// GET /api/character — 내 캐릭터 조회
router.get('/', async (req, res) => {
  try {
    const char = await Character.findOne({ userId: req.userId })
      .populate('activePetId', 'nickname speciesId rank stats attribute')
      .lean();
    if (!char) return res.status(404).json({ error: 'CHARACTER_NOT_FOUND' });
    res.json(char);
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /api/character — 캐릭터 생성
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 16 }).withMessage('이름은 1~16자'),
  body('attribute').isIn(Object.values(ATTRIBUTES)).withMessage('유효하지 않은 속성'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const exists = await Character.findOne({ userId: req.userId });
    if (exists) return res.status(409).json({ error: 'CHARACTER_ALREADY_EXISTS' });

    const { name, attribute } = req.body;
    const char = await Character.createForUser(req.userId, name, attribute);
    res.status(201).json(char);
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', detail: err.message });
  }
});

// POST /api/character/offline-reward — 오프라인 보상 수령
router.post('/offline-reward', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const char = await Character.findOne({ userId: req.userId });
    if (!char) return res.status(404).json({ error: 'CHARACTER_NOT_FOUND' });

    const rewards = calcOfflineRewards(user.lastLoginAt, user.vip.active);

    if (rewards.gold === 0 && rewards.exp === 0) {
      return res.json({ message: 'NO_REWARDS', rewards });
    }

    user.currency.gold += rewards.gold;
    user.lastLoginAt = new Date();
    await user.save();

    const levelsGained = char.addExp(rewards.exp);
    await char.save();

    res.json({ rewards, levelsGained });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

module.exports = router;
