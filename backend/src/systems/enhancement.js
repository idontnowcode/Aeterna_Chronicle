/**
 * 아이템 강화 시스템 (PRD v0.5 §6.3)
 */

const Item = require('../models/Item');
const { ENHANCEMENT_SUCCESS_RATES, getFailureWeights } = require('../models/Item');

function getEnhancementCost(currentStage) {
  const multiplier = Math.pow(1.4, currentStage);
  return {
    gold:         Math.floor(200 * multiplier),
    enhanceStone: Math.floor(1 * multiplier) + Math.floor(currentStage / 5),
  };
}

function rollFailureType(stage) {
  const weights = getFailureWeights(stage);
  const types   = ['material_loss', 'random_decrease', 'reset_to_1', 'destroy'];
  let rand = Math.random() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < types.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return types[i];
  }
  return 'material_loss';
}

async function tryEnhance(itemId, userId, userCurrency) {
  const item = await Item.findOne({ _id: itemId, userId });
  if (!item)              throw Object.assign(new Error('ITEM_NOT_FOUND'),         { status: 404 });
  if (item.isDestroyed)   throw Object.assign(new Error('ITEM_DESTROYED'),         { status: 400 });
  if (item.enhanceStage >= 20) throw Object.assign(new Error('ALREADY_MAX'),      { status: 400 });

  const stage = item.enhanceStage;
  const cost  = getEnhancementCost(stage);

  if ((userCurrency.gold || 0) < cost.gold)
    throw Object.assign(new Error('INSUFFICIENT_GOLD'), { status: 400 });
  if ((userCurrency.enhanceStone || 0) < cost.enhanceStone)
    throw Object.assign(new Error('INSUFFICIENT_ENHANCE_STONE'), { status: 400 });

  const successRate = ENHANCEMENT_SUCCESS_RATES[stage] ?? 0.03;
  const isSuccess   = Math.random() < successRate;

  let failureType = null;
  let destroyed   = false;
  let newStage    = stage;

  if (isSuccess) {
    newStage = stage + 1;
    item.enhanceStage = newStage;
    await item.save();
  } else {
    failureType = rollFailureType(stage);
    switch (failureType) {
      case 'material_loss':
        break;
      case 'random_decrease':
        newStage = Math.max(0, stage - (Math.floor(Math.random() * 3) + 1));
        item.enhanceStage = newStage;
        await item.save();
        break;
      case 'reset_to_1':
        newStage = 1;
        item.enhanceStage = 1;
        await item.save();
        break;
      case 'destroy':
        destroyed = true;
        item.isDestroyed = true;
        await item.save();
        break;
    }
  }

  return { success: isSuccess, failureType, destroyed, newStage, previousStage: stage, currencyUsed: cost };
}

module.exports = { tryEnhance, getEnhancementCost, rollFailureType };
