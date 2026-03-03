/**
 * 일일 퀘스트 시스템 (PRD v0.5 §9.2)
 */

const DailyQuest = require('../models/DailyQuest');
const { DAILY_QUEST_DEFINITIONS } = require('../models/DailyQuest');

async function updateQuestProgress(userId, questType, amount = 1) {
  const doc = await DailyQuest.getOrCreateToday(userId);
  const completedNow = [];

  for (const q of doc.quests) {
    if (q.completed) continue;
    if (q.type !== questType) continue;

    q.progress = Math.min(q.target, q.progress + amount);
    if (q.progress >= q.target) {
      q.completed = true;
      completedNow.push({ questId: q.questId, reward: q.reward });
    }
  }

  await doc.save();
  return { completedQuests: completedNow, allCompleted: doc.quests.every(q => q.completed) };
}

async function claimQuestReward(userId, questId) {
  const today = new Date().toISOString().slice(0, 10);
  const doc   = await DailyQuest.findOne({ userId, date: today });
  if (!doc) throw Object.assign(new Error('QUEST_NOT_FOUND'), { status: 404 });

  const q = doc.quests.find(q => q.questId === questId);
  if (!q)           throw Object.assign(new Error('QUEST_NOT_FOUND'),       { status: 404 });
  if (!q.completed) throw Object.assign(new Error('QUEST_NOT_COMPLETED'),   { status: 400 });
  if (q.claimed)    throw Object.assign(new Error('ALREADY_CLAIMED'),       { status: 400 });

  q.claimed = true;
  await doc.save();

  return { rewards: q.reward };
}

module.exports = { updateQuestProgress, claimQuestReward };
