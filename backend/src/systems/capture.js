/**
 * 포획 시스템 (PRD v0.5 §5.4)
 */

const Pet = require('../models/Pet');

// 포획 아이템 등급 보정
const CAPTURE_ITEM_BONUS = {
  basic:    1.0,
  advanced: 1.5,
  special:  2.5,
};

// 도감 중복 페트 포인트
const PET_POINT_BY_RANK = { S: 500, A: 200, B: 80, C: 30, D: 10 };

/**
 * 포획 성공 여부 계산
 * rate = (1 - currentHP/maxHP) × itemBonus × levelPenalty
 * levelPenalty: 몬스터 Lv이 높을수록 감소 (임시: 1.0 고정)
 */
function attemptCapture(monster, itemType = 'basic') {
  const hpRatio   = monster.currentHP / monster.maxHP;
  const itemBonus = CAPTURE_ITEM_BONUS[itemType] ?? 1.0;
  const rate      = Math.min(0.95, (1 - hpRatio) * itemBonus);
  const success   = Math.random() < rate;
  return { success, rate: Math.round(rate * 100) };
}

/**
 * 포획 성공 시 Pet 생성
 */
async function createCapturedPet(userId, monsterSpec) {
  const { monsterId, attribute, baseStats } = monsterSpec;
  return Pet.createFromCapture(userId, monsterId, attribute, baseStats || {});
}

function getDuplicatePetPoints(rank) {
  return PET_POINT_BY_RANK[rank] ?? 10;
}

module.exports = { attemptCapture, createCapturedPet, getDuplicatePetPoints, CAPTURE_ITEM_BONUS };
