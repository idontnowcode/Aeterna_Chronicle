/**
 * 아이템 강화 시스템 (PRD 6.3)
 * 최대 +20, 구간별 성공률 및 실패 유형 가중치 차등 적용
 */

const Item = require('../models/Item');
const { ENHANCEMENT_SUCCESS_RATES, FAILURE_WEIGHT_BY_STAGE } = require('../models/Item');

// 강화 단계별 소요 재료 (임시값 — 경제 밸런스 확정 후 조정)
function getEnhancementCost(currentStage) {
  const baseGold  = 200;
  const baseStone = 1;
  const multiplier = Math.pow(1.4, currentStage); // 단계마다 1.4배 증가

  return {
    gold:          Math.floor(baseGold  * multiplier),
    enhanceStone:  Math.floor(baseStone * multiplier) + Math.floor(currentStage / 5),
  };
}

/**
 * 실패 유형 결정 (가중치 기반 랜덤)
 * 유형: 'material_loss' | 'random_decrease' | 'reset_to_1' | 'destroy'
 */
function rollFailureType(stage) {
  const weights = FAILURE_WEIGHT_BY_STAGE(stage);
  const types   = ['material_loss', 'random_decrease', 'reset_to_1', 'destroy'];
  const total   = weights.reduce((s, w) => s + w, 0);
  let rand = Math.random() * total;

  for (let i = 0; i < types.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return types[i];
  }
  return types[0];
}

/**
 * 강화 시도
 * @param {string} itemId   - Item ObjectId
 * @param {string} userId   - 소유자 검증용
 * @param {object} userCurrency - { gold, enhanceStone }
 * @returns {object} { success, failureType, item, currencyUsed, newEnhancement, destroyed }
 */
async function tryEnhance(itemId, userId, userCurrency) {
  const item = await Item.findOne({ _id: itemId, ownerId: userId });
  if (!item) throw new Error('ITEM_NOT_FOUND');
  if (item.isEquipped) throw new Error('ITEM_IS_EQUIPPED');
  if (item.enhancement >= 20) throw new Error('ALREADY_MAX_ENHANCEMENT');

  const stage = item.enhancement;
  const cost  = getEnhancementCost(stage);

  if ((userCurrency.gold || 0) < cost.gold) throw new Error('INSUFFICIENT_GOLD');
  if ((userCurrency.enhanceStone || 0) < cost.enhanceStone) throw new Error('INSUFFICIENT_ENHANCE_STONE');

  // 성공 여부 판정
  const successRate = ENHANCEMENT_SUCCESS_RATES[stage] ?? 0.03;
  const isSuccess   = Math.random() < successRate;

  let failureType  = null;
  let destroyed    = false;
  let newEnhancement = stage;

  if (isSuccess) {
    newEnhancement = stage + 1;
    item.enhancement = newEnhancement;
    item.enhancementStats = item.calcEnhancementStats();
    await item.save();
  } else {
    failureType = rollFailureType(stage);

    switch (failureType) {
      case 'material_loss':
        // 소모재만 손실, 강화 수치 유지
        break;

      case 'random_decrease': {
        const decrease = Math.floor(Math.random() * 3) + 1; // -1 ~ -3
        newEnhancement = Math.max(0, stage - decrease);
        item.enhancement = newEnhancement;
        item.enhancementStats = item.calcEnhancementStats();
        await item.save();
        break;
      }

      case 'reset_to_1':
        newEnhancement = 1;
        item.enhancement = 1;
        item.enhancementStats = item.calcEnhancementStats();
        await item.save();
        break;

      case 'destroy':
        destroyed = true;
        await Item.deleteOne({ _id: itemId });
        break;
    }
  }

  return {
    success: isSuccess,
    failureType,
    destroyed,
    newEnhancement,
    previousEnhancement: stage,
    currencyUsed: cost,
    item: destroyed ? null : item,
  };
}

module.exports = { tryEnhance, getEnhancementCost, rollFailureType };
