/**
 * 6속성 시스템
 * 화→풍→목→지→뇌→수→화 (상성 사이클)
 */

const ATTRIBUTES = ['fire', 'wind', 'wood', 'earth', 'thunder', 'water'];

// 강함 관계: key 속성은 value 속성에 강함
const ATTRIBUTE_STRONG_AGAINST = {
  fire:    'wind',
  wind:    'wood',
  wood:    'earth',
  earth:   'thunder',
  thunder: 'water',
  water:   'fire',
};

/**
 * 속성 관계 반환
 * @returns 'strong' | 'weak' | 'neutral'
 */
function getAttributeRelation(attackerAttr, defenderAttr) {
  if (ATTRIBUTE_STRONG_AGAINST[attackerAttr] === defenderAttr) return 'strong';
  if (ATTRIBUTE_STRONG_AGAINST[defenderAttr] === attackerAttr) return 'weak';
  return 'neutral';
}

/**
 * 속성 배율 반환
 * 강: 1.3 / 약: 0.8 / 보통: 1.0
 */
function getAttributeMultiplier(attackerAttr, defenderAttr) {
  const rel = getAttributeRelation(attackerAttr, defenderAttr);
  if (rel === 'strong') return 1.3;
  if (rel === 'weak')   return 0.8;
  return 1.0;
}

module.exports = { ATTRIBUTES, ATTRIBUTE_STRONG_AGAINST, getAttributeRelation, getAttributeMultiplier };
