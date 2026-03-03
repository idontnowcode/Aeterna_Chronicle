const { getCollection, ObjectId } = require('../config/db-memory');

const col     = getCollection('characters');
const petCol  = getCollection('pets');

const V1_MAX_LEVEL   = 40;
const FULL_MAX_LEVEL = 120;

const BASE_STATS_BY_ATTRIBUTE = {
  fire:    { hp: 90,  mp: 60,  atk: 14, def: 8,  spd: 11, crit: 8,  dodge: 4  },
  water:   { hp: 100, mp: 80,  atk: 10, def: 12, spd: 10, crit: 5,  dodge: 5  },
  wood:    { hp: 110, mp: 70,  atk: 11, def: 11, spd: 9,  crit: 6,  dodge: 6  },
  thunder: { hp: 85,  mp: 65,  atk: 15, def: 7,  spd: 14, crit: 10, dodge: 7  },
  earth:   { hp: 120, mp: 50,  atk: 12, def: 15, spd: 7,  crit: 4,  dodge: 3  },
  wind:    { hp: 90,  mp: 75,  atk: 12, def: 9,  spd: 13, crit: 7,  dodge: 9  },
};

function calcRequiredXP(level) {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

function idStr(v) { return String(v?._id ?? v); }

function makeChar(raw) {
  return {
    ...raw,
    addExp(amount) {
      if (this.level >= FULL_MAX_LEVEL) return { leveled: false };
      this.exp += amount;
      let leveled = false;
      while (this.level < FULL_MAX_LEVEL) {
        const req = calcRequiredXP(this.level);
        if (this.exp < req) break;
        this.exp  -= req;
        this.level += 1;
        leveled = true;
        this.baseStats.hp    += 10;
        this.baseStats.mp    += 5;
        this.baseStats.atk   += 2;
        this.baseStats.def   += 1;
        this.baseStats.spd   += 0.5;
        this.baseStats.crit  += 0.3;
        this.baseStats.dodge += 0.2;
        this.currentHP = this.baseStats.hp;
        this.currentMP = this.baseStats.mp;
      }
      return { leveled, newLevel: this.level };
    },
    async save() {
      col._docs.set(idStr(this._id), { ...this });
      return this;
    },
  };
}

// findOne with optional chained .populate()
function findOneQuery(filter) {
  let _populate = null;
  const p = {
    populate(field) { _populate = field; return p; },
    then(resolve, reject) {
      (async () => {
        let found = null;
        for (const doc of col._docs.values()) {
          if (Object.entries(filter).every(([k, v]) => idStr(doc[k]) === idStr(v))) {
            found = makeChar({ ...doc });
            break;
          }
        }
        if (found && _populate && found[_populate]) {
          const petId = idStr(found[_populate]);
          const pet   = petCol._docs.get(petId);
          if (pet) found[_populate] = { ...pet };
        }
        return found;
      })().then(resolve).catch(reject);
    },
  };
  return p;
}

const Character = {
  findOne(filter) {
    return findOneQuery(filter);
  },
  async find(filter) {
    const results = [];
    for (const doc of col._docs.values()) {
      if (Object.entries(filter).every(([k, v]) => idStr(doc[k]) === idStr(v))) {
        results.push(makeChar({ ...doc }));
      }
    }
    return results;
  },
  async createForUser(userId, name, attribute) {
    const base = BASE_STATS_BY_ATTRIBUTE[attribute] || BASE_STATS_BY_ATTRIBUTE.fire;
    const id   = new ObjectId();
    const doc  = {
      _id: id, userId: idStr(userId), name, attribute,
      level: 1, exp: 0,
      baseStats: { ...base }, currentHP: base.hp, currentMP: base.mp,
      skillTree: { branch1: [0,0,0,0,0], branch2: [0,0,0,0,0], branch3: [0,0,0,0,0] },
      equipment: { weapon: null, armor: null, accessory: null },
      activePetId: null, storyProgress: 0,
      createdAt: new Date(), updatedAt: new Date(),
    };
    col._docs.set(idStr(id), doc);
    return makeChar({ ...doc });
  },
};

module.exports = Character;
module.exports.calcRequiredXP = calcRequiredXP;
module.exports.V1_MAX_LEVEL   = V1_MAX_LEVEL;
