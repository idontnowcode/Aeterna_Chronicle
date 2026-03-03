/**
 * 인메모리 데이터베이스 (MongoDB 없이 동작하는 프로토타입용)
 * Mongoose API와 유사한 인터페이스 제공
 */

const { randomUUID } = require('crypto');

class ObjectId {
  constructor(id) { this._id = id || randomUUID(); }
  toString() { return this._id; }
  equals(other) {
    const otherId = other instanceof ObjectId ? other._id : String(other);
    return this._id === otherId;
  }
  toJSON() { return this._id; }
}

class Query {
  constructor(docs, selectFields) {
    this._docs = docs;
    this._select = null;
    this._populate = [];
    this._lean = false;
  }
  select(fields) { this._select = fields; return this; }
  populate(field, select) { this._populate.push({ field, select }); return this; }
  lean() { this._lean = true; return this; }
  then(resolve, reject) {
    Promise.resolve(this._docs).then(resolve).catch(reject);
  }
}

class Collection {
  constructor(name) {
    this.name = name;
    this._docs = new Map();
    this._indexes = new Map();
  }

  _match(doc, filter) {
    for (const [k, v] of Object.entries(filter)) {
      if (k === '_id') {
        const docId = doc._id instanceof ObjectId ? doc._id._id : String(doc._id);
        const filterId = v instanceof ObjectId ? v._id : String(v);
        if (docId !== filterId) return false;
      } else if (doc[k] !== v) {
        return false;
      }
    }
    return true;
  }

  findById(id) {
    const strId = id instanceof ObjectId ? id._id : String(id);
    const doc = this._docs.get(strId);
    return Promise.resolve(doc ? { ...doc } : null);
  }

  findOne(filter) {
    for (const doc of this._docs.values()) {
      if (this._match(doc, filter)) return Promise.resolve({ ...doc });
    }
    return Promise.resolve(null);
  }

  find(filter = {}) {
    const results = [];
    for (const doc of this._docs.values()) {
      if (Object.keys(filter).length === 0 || this._match(doc, filter)) {
        results.push({ ...doc });
      }
    }
    return Promise.resolve(results);
  }

  create(data) {
    const id = new ObjectId();
    const doc = { ...data, _id: id, createdAt: new Date(), updatedAt: new Date() };
    this._docs.set(id._id, doc);
    return Promise.resolve({ ...doc });
  }

  save(doc) {
    const id = doc._id instanceof ObjectId ? doc._id._id : String(doc._id);
    doc.updatedAt = new Date();
    this._docs.set(id, { ...doc });
    return Promise.resolve(doc);
  }

  deleteOne(filter) {
    for (const [key, doc] of this._docs.entries()) {
      if (this._match(doc, filter)) {
        this._docs.delete(key);
        return Promise.resolve({ deletedCount: 1 });
      }
    }
    return Promise.resolve({ deletedCount: 0 });
  }
}

const collections = new Map();

function getCollection(name) {
  if (!collections.has(name)) collections.set(name, new Collection(name));
  return collections.get(name);
}

module.exports = { getCollection, ObjectId };
