const { getCollection, ObjectId } = require('../config/db-memory');

const col = getCollection('items');

const ENHANCEMENT_SUCCESS_RATES = [
  1.00, 0.90, 0.85, 0.80, 0.75, 0.70,
  0.65, 0.60, 0.55, 0.50, 0.45,
  0.40, 0.35, 0.30, 0.25, 0.20,
  0.15, 0.12, 0.09, 0.06, 0.03,
];

function getFailureWeights(stage) {
  if (stage <= 5)  return [100, 0,  0,  0 ];
  if (stage <= 10) return [50,  50, 0,  0 ];
  if (stage <= 15) return [0,   50, 50, 0 ];
  return                  [0,   0,  60, 40];
}

function idStr(v) { return String(v?._id ?? v); }

function makeItem(raw) {
  return {
    ...raw,
    calcEnhancementStats() {
      const s = this.enhanceStage;
      return {
        atk: Math.floor(this.baseStats.atk * s * 0.08),
        def: Math.floor(this.baseStats.def * s * 0.08),
        hp:  Math.floor(this.baseStats.hp  * s * 0.08),
        spd: Math.floor(this.baseStats.spd * s * 0.08),
      };
    },
    getTotalStats() {
      const bonus = this.calcEnhancementStats();
      return {
        atk: this.baseStats.atk + bonus.atk,
        def: this.baseStats.def + bonus.def,
        hp:  this.baseStats.hp  + bonus.hp,
        spd: this.baseStats.spd + bonus.spd,
      };
    },
    async save() {
      col._docs.set(idStr(this._id), { ...this });
      return this;
    },
  };
}

const Item = {
  async find(filter) {
    const results = [];
    for (const doc of col._docs.values()) {
      if (Object.entries(filter).every(([k, v]) => idStr(doc[k]) === idStr(v))) {
        results.push(makeItem({ ...doc }));
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
      if (match) return makeItem({ ...doc });
    }
    return null;
  },
  async create(data) {
    const id  = new ObjectId();
    const doc = {
      _id: id, userId: idStr(data.userId),
      templateId: data.templateId, name: data.name,
      type: data.type, grade: data.grade || 'common',
      attribute: data.attribute || 'none',
      enhanceStage: 0, isDestroyed: false,
      baseStats: { atk: 0, def: 0, hp: 0, spd: 0, ...(data.baseStats || {}) },
      createdAt: new Date(), updatedAt: new Date(),
    };
    col._docs.set(idStr(id), doc);
    return makeItem({ ...doc });
  },
  async deleteOne(filter) {
    for (const [key, doc] of col._docs.entries()) {
      if (Object.entries(filter).every(([k, v]) => idStr(doc[k]) === idStr(v))) {
        col._docs.delete(key);
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  },
};

module.exports = Item;
module.exports.ENHANCEMENT_SUCCESS_RATES = ENHANCEMENT_SUCCESS_RATES;
module.exports.getFailureWeights = getFailureWeights;
