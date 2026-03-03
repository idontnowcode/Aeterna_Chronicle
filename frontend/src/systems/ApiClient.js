/**
 * API 클라이언트 — 백엔드 REST API 통신
 */

const BASE_URL = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('ac_token') || null;
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('ac_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('ac_token');
  }

  async _request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.error || 'API_ERROR');
      err.status = res.status;
      err.data   = data;
      throw err;
    }
    return data;
  }

  // ── 인증 ──
  register(username, email, password) {
    return this._request('POST', '/auth/register', { username, email, password });
  }

  login(email, password) {
    return this._request('POST', '/auth/login', { email, password });
  }

  // ── 캐릭터 ──
  getCharacter() {
    return this._request('GET', '/character');
  }

  createCharacter(name, attribute, appearance = {}) {
    return this._request('POST', '/character', { name, attribute, appearance });
  }

  claimOfflineReward() {
    return this._request('POST', '/character/offline-reward');
  }

  // ── 전투 ──
  startBattle(monsterId, auto = true) {
    return this._request('POST', '/combat/battle', { monsterId, auto });
  }

  // ── 페트 ──
  getPets() {
    return this._request('GET', '/pet');
  }

  capturePet(monsterId, itemType, monsterCurrentHP, monsterMaxHP, monsterSpec) {
    return this._request('POST', '/pet/capture', {
      monsterId, itemType, monsterCurrentHP, monsterMaxHP, monsterSpec,
    });
  }

  renamePet(petId, nickname) {
    return this._request('PATCH', `/pet/${petId}/nickname`, { nickname });
  }

  equipPet(petId) {
    return this._request('PATCH', `/pet/${petId}/equip`);
  }

  // ── 아이템 ──
  getItems() {
    return this._request('GET', '/item');
  }

  enhanceItem(itemId, enhanceStoneCount) {
    return this._request('POST', `/item/${itemId}/enhance`, { enhanceStoneCount });
  }

  // ── 퀘스트 ──
  getDailyQuests() {
    return this._request('GET', '/quest/daily');
  }

  claimQuestReward(questId) {
    return this._request('POST', `/quest/daily/${questId}/claim`);
  }
}

export default new ApiClient();
