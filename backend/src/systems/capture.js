/**
 * 포획 시스템 (PRD 5.6)
 * 공식: 포획률 = (1 - currentHP/maxHP) × 아이템등급 보정 × RANK 보정
 * 수치는 임시값 — 플레이 테스트 후 조정 예정
 */

const Pet = require('../models/Pet');
const { randomGrowthRate } = require('../models/Pet');

// 포획 아이템 등급 보정 (PRD 5.6)
const CAPTURE_ITEM_BONUS = {
  basic:    1.0,  // 기본 포획구
  advanced: 1.5,  // 상급 포획구
  special:  2.5,  // 특급 포획구
};

// RANK 보정 (PRD 5.6)
const CAPTURE_RANK_BONUS = {
  D: 2.0,
  C: 1.5,
  B: 1.0,
  A: 0.5,
  S: 0.25,
};

// 포획 성공률 최댓값 (100%는 불가 — S랭크 극악 방지)
const MAX_CAPTURE_RATE = 0.95;

/**
 * 포획 성공 여부 계산
 * @param {object} monster - { rank, currentHP, maxHP }
 * @param {string} itemType - 'basic' | 'advanced' | 'special'
 * @returns {object} { success, rate }
 */
function attemptCapture(monster, itemType = 'basic') {
  const hpRatio     = monster.currentHP / monster.maxHP;
  const itemBonus   = CAPTURE_ITEM_BONUS[itemType] ?? 1.0;
  const rankBonus   = CAPTURE_RANK_BONUS[monster.rank] ?? 1.0;

  const rate    = Math.min(MAX_CAPTURE_RATE, (1 - hpRatio) * itemBonus * rankBonus);
  const success = Math.random() < rate;

  return { success, rate: Math.round(rate * 100) };
}

/**
 * 포획 성공 시 Pet 도큐먼트 생성
 * @param {string} ownerId - 유저 ObjectId
 * @param {object} monsterSpec - 마스터 데이터 기반 몬스터 스펙
 */
async function createCapturedPet(ownerId, monsterSpec) {
  const { speciesId, name, attribute, rank, baseStats } = monsterSpec;

  const growthRate = {
    hp:   randomGrowthRate(rank),
    atk:  randomGrowthRate(rank),
    matk: randomGrowthRate(rank),
    def:  randomGrowthRate(rank),
    mdef: randomGrowthRate(rank),
    spd:  randomGrowthRate(rank),
  };

  const pet = new Pet({
    ownerId,
    speciesId,
    attribute,
    rank,
    growthRate,
    stats: { ...baseStats, crit: 5, dodge: 3 },
    acquiredFrom: 'capture',
  });

  await pet.save();
  return pet;
}

/**
 * 도감 중복 페트 처리 — 페트 포인트로 전환 (PRD 5.6)
 */
const PET_POINT_BY_RANK = { S: 500, A: 200, B: 80, C: 30, D: 10 };

function getDuplicatePetPoints(rank) {
  return PET_POINT_BY_RANK[rank] ?? 10;
}

module.exports = {
  attemptCapture,
  createCapturedPet,
  getDuplicatePetPoints,
  CAPTURE_ITEM_BONUS,
  CAPTURE_RANK_BONUS,
};
