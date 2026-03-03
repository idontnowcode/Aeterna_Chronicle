const express = require('express');
const auth      = require('../middleware/auth');
const Pet       = require('../models/Pet');
const Character = require('../models/Character');
const User      = require('../models/User');
const { attemptCapture, createCapturedPet, getDuplicatePetPoints } = require('../systems/capture');
const { updateQuestProgress } = require('../systems/dailyQuest');

const router = express.Router();
router.use(auth);

// GET /api/pet
router.get('/', async (req, res) => {
  try {
    const pets = await Pet.find({ userId: req.userId }).lean();
    res.json(pets);
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/pet/:id
router.get('/:id', async (req, res) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.id, userId: req.userId }).lean();
    if (!pet) return res.status(404).json({ error: 'PET_NOT_FOUND' });
    res.json(pet);
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /api/pet/capture
router.post('/capture', async (req, res) => {
  try {
    const { monsterId, itemType = 'basic', monsterCurrentHP, monsterMaxHP, monsterSpec } = req.body;
    if (!monsterSpec) return res.status(400).json({ error: 'MONSTER_SPEC_REQUIRED' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const itemCost = { basic: 50, advanced: 150, special: 400 }[itemType] ?? 50;
    if (user.currency.petPoint < itemCost) {
      return res.status(400).json({ error: 'INSUFFICIENT_PET_POINT' });
    }

    const captureResult = attemptCapture(
      { currentHP: monsterCurrentHP, maxHP: monsterMaxHP },
      itemType
    );

    user.currency.petPoint -= itemCost;

    if (!captureResult.success) {
      await user.save();
      return res.json({ success: false, rate: captureResult.rate });
    }

    // 중복 확인
    const alreadyOwned = await Pet.findOne({ userId: req.userId, monsterId });
    if (alreadyOwned) {
      const bonus = getDuplicatePetPoints(monsterSpec.rank || 'B');
      user.currency.petPoint += bonus;
      await user.save();
      return res.json({ success: true, duplicate: true, petPointsGained: bonus });
    }

    const pet = await createCapturedPet(req.userId, { monsterId, ...monsterSpec });
    await user.save();
    await updateQuestProgress(req.userId, 'capture', 1);

    res.status(201).json({ success: true, duplicate: false, pet });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', detail: err.message });
  }
});

// PATCH /api/pet/:id/nickname
router.patch('/:id/nickname', async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname || nickname.length > 16) {
      return res.status(400).json({ error: 'INVALID_NICKNAME' });
    }

    const pet = await Pet.findOne({ _id: req.params.id, userId: req.userId });
    if (!pet) return res.status(404).json({ error: 'PET_NOT_FOUND' });

    if (pet.nickname) {
      const RENAME_COST = 500;
      const user = await User.findById(req.userId);
      if (user.currency.gold < RENAME_COST) {
        return res.status(400).json({ error: 'INSUFFICIENT_GOLD', cost: RENAME_COST });
      }
      user.currency.gold -= RENAME_COST;
      await user.save();
    }

    pet.nickname = nickname;
    await pet.save();
    res.json({ pet });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// PATCH /api/pet/:id/equip
router.patch('/:id/equip', async (req, res) => {
  try {
    const pet  = await Pet.findOne({ _id: req.params.id, userId: req.userId });
    if (!pet)  return res.status(404).json({ error: 'PET_NOT_FOUND' });

    const char = await Character.findOne({ userId: req.userId });
    if (!char) return res.status(404).json({ error: 'CHARACTER_NOT_FOUND' });

    char.activePetId = pet._id;
    await char.save();
    res.json({ message: 'PET_EQUIPPED', activePetId: pet._id });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

module.exports = router;
