const express = require('express');
const auth      = require('../middleware/auth');
const Character = require('../models/Character');
const Pet       = require('../models/Pet');
const User      = require('../models/User');
const { simulateBattle } = require('../systems/combat');
const { updateQuestProgress } = require('../systems/dailyQuest');

const router = express.Router();
router.use(auth);

// 임시 몬스터 데이터 (실제로는 DB 마스터 테이블에서 조회)
const TEMP_MONSTERS = {
  slime_lv5: {
    id: 'slime_lv5', name: '슬라임', attribute: 'water', level: 5,
    stats: { hp: 180, mp: 0, atk: 12, matk: 8, def: 5, mdef: 5, spd: 10, crit: 2, dodge: 2 },
    skills: [],
    rewards: { gold: 30, exp: 25, petPoint: 8 },
    canCapture: true,
    rank: 'D',
  },
  fire_wolf_lv15: {
    id: 'fire_wolf_lv15', name: '화염 늑대', attribute: 'fire', level: 15,
    stats: { hp: 450, mp: 0, atk: 35, matk: 20, def: 15, mdef: 12, spd: 28, crit: 8, dodge: 5 },
    skills: [],
    rewards: { gold: 80, exp: 70, petPoint: 20 },
    canCapture: true,
    rank: 'C',
  },
};

/**
 * POST /api/combat/battle
 * Body: { monsterId, auto? }
 */
router.post('/battle', async (req, res) => {
  try {
    const { monsterId, auto = true } = req.body;
    const monster = TEMP_MONSTERS[monsterId];
    if (!monster) return res.status(404).json({ error: 'MONSTER_NOT_FOUND' });

    const char = await Character.findOne({ userId: req.userId })
      .populate('activePetId');
    if (!char) return res.status(404).json({ error: 'CHARACTER_NOT_FOUND' });

    // 플레이어 전투 스탯 구성 (캐릭터 + 페트)
    const petStats = char.activePetId
      ? char.activePetId.stats
      : { hp: 0, mp: 0, atk: 0, matk: 0, def: 0, mdef: 0, spd: 0, crit: 0, dodge: 0 };

    const petSkills = char.activePetId?.skills ?? [];

    const playerCombined = {
      attribute: char.attribute,
      stats: {
        hp:    char.baseStats.hp    + (petStats.hp    || 0),
        mp:    char.baseStats.mp    + (petStats.mp    || 0),
        atk:   char.baseStats.atk   + (petStats.atk   || 0),
        matk:  char.baseStats.matk  + (petStats.matk  || 0),
        def:   char.baseStats.def   + (petStats.def   || 0),
        mdef:  char.baseStats.mdef  + (petStats.mdef  || 0),
        spd:   char.baseStats.spd   + (petStats.spd   || 0),
        crit:  char.baseStats.crit  + (petStats.crit  || 0),
        dodge: char.baseStats.dodge + (petStats.dodge || 0),
      },
      skills: petSkills,
    };

    const result = simulateBattle({
      player: playerCombined,
      enemy: { attribute: monster.attribute, stats: monster.stats, skills: monster.skills },
      auto,
    });

    // 승리 시 보상 지급
    if (result.result === 'win') {
      const user = await User.findById(req.userId);
      user.currency.gold     += monster.rewards.gold;
      user.currency.petPoint += monster.rewards.petPoint;
      await user.save();

      const levelsGained = char.addExp(monster.rewards.exp);
      await char.save();

      // 일일 퀘스트 진행도 업데이트
      await updateQuestProgress(req.userId, 'hunt', 1);

      result.rewards    = monster.rewards;
      result.levelsGained = levelsGained;
    }

    // 로그는 디버그용 — 프로덕션에서는 제외 가능
    res.json({
      result:       result.result,
      turns:        result.turns,
      rewards:      result.rewards ?? null,
      levelsGained: result.levelsGained ?? [],
      remainingHP:  result.remainingHP,
    });
  } catch (err) {
    res.status(500).json({ error: 'SERVER_ERROR', detail: err.message });
  }
});

module.exports = router;
