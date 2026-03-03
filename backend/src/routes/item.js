const express = require('express');
const auth    = require('../middleware/auth');
const Item    = require('../models/Item');
const User    = require('../models/User');
const { tryEnhance } = require('../systems/enhancement');
const { updateQuestProgress } = require('../systems/dailyQuest');

const router = express.Router();
router.use(auth);

// GET /api/item — 인벤토리 목록
router.get('/', async (req, res) => {
  try {
    const items = await Item.find({ ownerId: req.userId }).lean();
    res.json(items);
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/item/:id — 아이템 상세
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, ownerId: req.userId }).lean();
    if (!item) return res.status(404).json({ error: 'ITEM_NOT_FOUND' });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/item/:id/enhance — 강화 시도 (PRD 6.3)
 */
router.post('/:id/enhance', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const result = await tryEnhance(
      req.params.id,
      req.userId,
      {
        gold:         user.currency.gold,
        enhanceStone: req.body.enhanceStoneCount ?? 0, // 임시: 클라이언트에서 전달
      }
    );

    // 재화 차감
    user.currency.gold -= result.currencyUsed.gold;
    await user.save();

    // 일일 퀘스트 진행 (성공 여부 무관)
    await updateQuestProgress(req.userId, 'enhance', 1);

    res.json({
      success:             result.success,
      failureType:         result.failureType,
      destroyed:           result.destroyed,
      previousEnhancement: result.previousEnhancement,
      newEnhancement:      result.newEnhancement,
      currencyUsed:        result.currencyUsed,
      item:                result.item,
    });
  } catch (err) {
    const clientErrors = [
      'ITEM_NOT_FOUND', 'ITEM_IS_EQUIPPED',
      'ALREADY_MAX_ENHANCEMENT', 'INSUFFICIENT_GOLD', 'INSUFFICIENT_ENHANCE_STONE',
    ];
    if (clientErrors.includes(err.message)) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'SERVER_ERROR', detail: err.message });
  }
});

module.exports = router;
