/**
 * 일일 퀘스트 시스템 (PRD 9.2)
 */

const DailyQuest = require('../models/DailyQuest');
const { DAILY_QUEST_DEFINITIONS } = require('../models/DailyQuest');

/**
 * 퀘스트 진행도 업데이트
 * @param {string} userId
 * @param {string} questType - 'hunt' | 'enhance' | 'capture' | 'story_clear'
 * @param {number} amount    - 증가량
 * @returns {object} { completedQuests: [], allCompleted: boolean }
 */
async function updateQuestProgress(userId, questType, amount = 1) {
  const doc = await DailyQuest.getOrCreateToday(userId);
  const completedNow = [];

  for (const q of doc.quests) {
    if (q.completed) continue;

    const def = DAILY_QUEST_DEFINITIONS.find((d) => d.id === q.questId);
    if (!def || def.type !== questType) continue;

    q.progress = Math.min(def.target, q.progress + amount);
    if (q.progress >= def.target) {
      q.completed = true;
      completedNow.push(def);
    }
  }

  await doc.save();

  const allCompleted = doc.quests.every((q) => q.completed);
  return { completedQuests: completedNow, allCompleted, doc };
}

/**
 * 보상 수령
 * @param {string} userId
 * @param {string} questId
 * @returns {object} { rewards }
 */
async function claimQuestReward(userId, questId) {
  const doc = await DailyQuest.findOne({ userId, date: DailyQuest.todayKey() });
  if (!doc) throw new Error('QUEST_NOT_FOUND');

  const q = doc.quests.find((q) => q.questId === questId);
  if (!q) throw new Error('QUEST_NOT_FOUND');
  if (!q.completed) throw new Error('QUEST_NOT_COMPLETED');
  if (q.claimedAt) throw new Error('ALREADY_CLAIMED');

  const def = DAILY_QUEST_DEFINITIONS.find((d) => d.id === questId);
  if (!def) throw new Error('QUEST_DEF_NOT_FOUND');

  q.claimedAt = new Date();
  await doc.save();

  return { rewards: def.rewards };
}

module.exports = { updateQuestProgress, claimQuestReward };
