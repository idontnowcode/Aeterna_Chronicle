const express = require('express');
const auth      = require('../middleware/auth');
const Pet       = require('../models/Pet');
const Character = require('../models/Character');
const User      = require('../models/User');
const { attemptCapture, createCapturedPet, getDuplicatePetPoints } = require('../systems/capture');
const { updateQuestProgress } = require('../systems/dailyQuest');

const router = express.Router();
router.use(auth);

// GET /api/pet — 보유 페트 목록
router.get('/', async (req, res) => {
  try {
    const pets = await Pet.find({ ownerId: req.userId }).lean();
    res.json(pets);
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/pet/:id — 페트 상세
router.get('/:id', async (req, res) => {
  try {
    const pet = await Pet.findOne({ _id: req.params.id, ownerId: req.userId }).lean();
    if (!pet) return res.status(404).json({ error: 'PET_NOT_FOUND' });
    res.json(pet);
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/pet/capture
 * Body: { monsterId, itemType, monsterCurrentHP, monsterMaxHP }
 * 임시: 몬스터 스펙은 클라이언트에서 전달 (추후 서버 마스터 데이터로 교체)
 */
router.post('/capture', async (req, res) => {
  try {
    const { monsterId, itemType = 'basic', monsterCurrentHP, monsterMaxHP, monsterSpec } = req.body;
    if (!monsterSpec) return res.status(400).json({ error: 'MONSTER_SPEC_REQUIRED' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    // 포획 아이템 재화 차감 (임시: 기본 포획구 50 petPoint)
    const itemCost = { basic: 50, advanced: 150, special: 400 }[itemType] ?? 50;
    if (user.currency.petPoint < itemCost) {
      return res.status(400).json({ error: 'INSUFFICIENT_PET_POINT' });
    }

    // 포획 시도
    const captureResult = attemptCapture(
      { rank: monsterSpec.rank, currentHP: monsterCurrentHP, maxHP: monsterMaxHP },
      itemType
    );

    user.currency.petPoint -= itemCost;

    // 일일 퀘스트 진행도 업데이트 (성공 여부 무관)
    await updateQuestProgress(req.userId, 'capture', 1);

    if (!captureResult.success) {
      await user.save();
      return res.json({ success: false, rate: captureResult.rate });
    }

    // 도감 중복 확인
    const alreadyOwned = await Pet.findOne({ ownerId: req.userId, speciesId: monsterSpec.speciesId });
    if (alreadyOwned) {
      // 중복 → 페트 포인트로 전환
      const bonus = getDuplicatePetPoints(monsterSpec.rank);
      user.currency.petPoint += bonus;
      await user.save();
      return res.json({ success: true, duplicate: true, petPointsGained: bonus });
    }

    // 신규 페트 생성
    const pet = await createCapturedPet(req.userId, monsterSpec);
    await user.save();

    res.status(201).json({ success: true, duplicate: false, pet });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', detail: err.message });
  }
});

// PATCH /api/pet/:id/nickname — 닉네임 변경 (PRD 10.1: 1회 무료, 이후 골드)
router.patch('/:id/nickname', async (req, res) => {
  try {
    const { nickname } = req.body;
    if (!nickname || nickname.length > 16) {
      return res.status(400).json({ error: 'INVALID_NICKNAME' });
    }

    const pet = await Pet.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!pet) return res.status(404).json({ error: 'PET_NOT_FOUND' });

    const RENAME_COST = 500; // 골드

    if (pet.nickname !== null) {
      // 이미 이름이 있으면 골드 차감
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

// PATCH /api/pet/:id/equip — 페트 장착
router.patch('/:id/equip', async (req, res) => {
  try {
    const pet  = await Pet.findOne({ _id: req.params.id, ownerId: req.userId });
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
