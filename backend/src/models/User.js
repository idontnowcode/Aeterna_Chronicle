const bcrypt = require('bcryptjs');
const { getCollection, ObjectId } = require('../config/db-memory');

const col = getCollection('users');

function makeUser(raw) {
  const u = {
    ...raw,
    comparePassword(plain) { return bcrypt.compare(this.password, plain); },
    isVip() { return this.vip?.active && (!this.vip.expiresAt || this.vip.expiresAt > new Date()); },
    async save() {
      const id = String(this._id?._id ?? this._id);
      col._docs.set(id, { ...this });
      return this;
    },
  };
  return u;
}

const User = {
  async create(data) {
    for (const doc of col._docs.values()) {
      if (doc.email === data.email?.toLowerCase()) {
        const err = new Error('Duplicate'); err.code = 11000; err.keyValue = { email: data.email }; throw err;
      }
      if (doc.username === data.username) {
        const err = new Error('Duplicate'); err.code = 11000; err.keyValue = { username: data.username }; throw err;
      }
    }
    const id  = new ObjectId();
    const doc = {
      _id: id, username: data.username, email: data.email?.toLowerCase(),
      password: await bcrypt.hash(data.password, 12),
      currency:  { gold: 500, crystal: 50, petPoint: 100 },
      vip:       { active: false, expiresAt: null },
      lastLoginAt: new Date(), dailyQuestResetAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    col._docs.set(String(id), doc);
    return makeUser(doc);
  },

  async findById(id) {
    const doc = col._docs.get(String(id?._id ?? id));
    return doc ? makeUser(doc) : null;
  },

  findOne(filter) {
    const p = (async () => {
      for (const doc of col._docs.values()) {
        if (Object.entries(filter).every(([k, v]) => doc[k] === v)) return makeUser(doc);
      }
      return null;
    })();
    p.select = () => p; // no-op — password always available in-memory
    return p;
  },
};

module.exports = User;
