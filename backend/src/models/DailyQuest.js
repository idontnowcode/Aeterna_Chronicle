const { getCollection, ObjectId } = require('../config/db-memory');

const col = getCollection('daily_quests');

const DAILY_QUEST_DEFINITIONS = [
  { id: 'hunt_10',   type: 'hunt',        target: 10, reward: { gold: 200, exp: 150 } },
  { id: 'hunt_30',   type: 'hunt',        target: 30, reward: { gold: 500, exp: 400 } },
  { id: 'enhance_1', type: 'enhance',     target: 1,  reward: { gold: 100, exp: 80  } },
  { id: 'enhance_3', type: 'enhance',     target: 3,  reward: { gold: 300, exp: 250 } },
  { id: 'capture_1', type: 'capture',     target: 1,  reward: { gold: 150, exp: 120, petPoint: 50 } },
  { id: 'story_3',   type: 'story_clear', target: 3,  reward: { gold: 400, exp: 350, crystal: 5   } },
];

function idStr(v) { return String(v?._id ?? v); }

function makeDoc(raw) {
  return {
    ...raw,
    async save() {
      const key = `${idStr(this.userId)}:${this.date}`;
      col._docs.set(key, { ...this });
      return this;
    },
  };
}

const DailyQuest = {
  async getOrCreateToday(userId) {
    const today = new Date().toISOString().slice(0, 10);
    const key   = `${idStr(userId)}:${today}`;
    let   doc   = col._docs.get(key);
    if (!doc) {
      doc = {
        _id: new ObjectId(), userId: idStr(userId), date: today,
        quests: DAILY_QUEST_DEFINITIONS.map(q => ({
          questId: q.id, type: q.type, target: q.target,
          progress: 0, completed: false, claimed: false, reward: q.reward,
        })),
        createdAt: new Date(), updatedAt: new Date(),
      };
      col._docs.set(key, doc);
    }
    return makeDoc({ ...doc });
  },

  async findOne(filter) {
    for (const doc of col._docs.values()) {
      if (Object.entries(filter).every(([k, v]) => idStr(doc[k]) === idStr(v))) {
        return makeDoc({ ...doc });
      }
    }
    return null;
  },
};

module.exports = DailyQuest;
module.exports.DAILY_QUEST_DEFINITIONS = DAILY_QUEST_DEFINITIONS;
