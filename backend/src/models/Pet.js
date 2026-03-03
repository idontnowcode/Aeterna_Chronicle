const { getCollection, ObjectId } = require('../config/db-memory');

const col = getCollection('pets');

const PET_RANKS = {
  S: { weight: 5,  statBonus: 0.20,  growthCoeff: 1.5 },
  A: { weight: 20, statBonus: 0.10,  growthCoeff: 1.2 },
  B: { weight: 50, statBonus: 0.00,  growthCoeff: 1.0 },
  C: { weight: 20, statBonus: -0.10, growthCoeff: 0.8 },
  D: { weight: 5,  statBonus: -0.20, growthCoeff: 0.6 },
};

const BASE_LEVEL_GROWTH = { hp: 10, atk: 2, def: 1, spd: 0.5 };

function rollRank() {
  const r = Math.random() * 100;
  let cum = 0;
  for (const [rank, info] of Object.entries(PET_RANKS)) {
    cum += info.weight;
    if (r < cum) return rank;
  }
  return 'B';
}

function idStr(v) { return String(v?._id ?? v); }

function makePet(raw) {
  return {
    ...raw,
    addExp(amount) {
      const MAX = 60;
      if (this.level >= MAX) return { leveled: false };
      this.exp += amount;
      let leveled = false;
      while (this.level < MAX && this.exp >= 80) {
        this.exp -= 80; this.level += 1; leveled = true;
        for (const stat of ['hp','atk','def','spd']) {
          const coeff = PET_RANKS[this.rank[stat]].growthCoeff;
          this.baseStats[stat] += BASE_LEVEL_GROWTH[stat] * coeff;
        }
      }
      return { leveled, newLevel: this.level };
    },
    async save() {
      col._docs.set(idStr(this._id), { ...this });
      return this;
    },
  };
}

const Pet = {
  async find(filter) {
    const results = [];
    for (const doc of col._docs.values()) {
      if (Object.entries(filter).every(([k, v]) => idStr(doc[k]) === idStr(v))) {
        results.push(makePet({ ...doc }));
      }
    }
    return results;
  },
  async findOne(filter) {
    for (const doc of col._docs.values()) {
      const match = Object.entries(filter).every(([k, v]) => {
        if (k === '_id') return idStr(doc._id) === idStr(v);
        return idStr(doc[k]) === idStr(v);
      });
      if (match) return makePet({ ...doc });
    }
    return null;
  },
  async createFromCapture(userId, monsterId, attribute, monsterBaseStats) {
    const ranks = { hp: rollRank(), atk: rollRank(), def: rollRank(), spd: rollRank() };
    const bonus = stat => 1 + PET_RANKS[ranks[stat]].statBonus;
    const id    = new ObjectId();
    const doc   = {
      _id: id, userId: idStr(userId), monsterId, nickname: '', attribute,
      rank: ranks,
      level: 1, exp: 0,
      baseStats: {
        hp:  Math.floor((monsterBaseStats.hp  || 50) * bonus('hp')),
        atk: Math.floor((monsterBaseStats.atk || 10) * bonus('atk')),
        def: Math.floor((monsterBaseStats.def || 5)  * bonus('def')),
        spd: Math.floor((monsterBaseStats.spd || 8)  * bonus('spd')),
      },
      isEquipped: false, unlockedSkills: [],
      createdAt: new Date(), updatedAt: new Date(),
    };
    col._docs.set(idStr(id), doc);
    return makePet({ ...doc });
  },
};

module.exports = Pet;
module.exports.PET_RANKS = PET_RANKS;
