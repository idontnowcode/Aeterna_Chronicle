const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const DailyQuest = require('../models/DailyQuest');
const { claimQuestReward } = require('../systems/dailyQuest');
const { DAILY_QUEST_DEFINITIONS } = require('../models/DailyQuest');

const router = express.Router();
router.use(auth);

// GET /api/quest/daily — 오늘 일일 퀘스트 목록 + 진행도
router.get('/daily', async (req, res) => {
  try {
    const doc = await DailyQuest.getOrCreateToday(req.userId);

    const quests = DAILY_QUEST_DEFINITIONS.map((def) => {
      const progress = doc.quests.find((q) => q.questId === def.id);
      return {
        ...def,
        progress:   progress?.progress  ?? 0,
        completed:  progress?.completed ?? false,
        claimedAt:  progress?.claimedAt ?? null,
      };
    });

    res.json({ date: doc.date, quests });
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /api/quest/daily/:questId/claim — 보상 수령
router.post('/daily/:questId/claim', async (req, res) => {
  try {
    const { rewards } = await claimQuestReward(req.userId, req.params.questId);

    const user = await User.findById(req.userId);
    user.currency.gold     += rewards.gold     ?? 0;
    user.currency.petPoint += rewards.petPoint ?? 0;
    await user.save();

    // exp 보상은 캐릭터에 직접 부여 (간략화: 여기선 user에 기록만)
    res.json({ rewards });
  } catch (err) {
    const clientErrors = ['QUEST_NOT_FOUND', 'QUEST_NOT_COMPLETED', 'ALREADY_CLAIMED', 'QUEST_DEF_NOT_FOUND'];
    if (clientErrors.includes(err.message)) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

module.exports = router;
