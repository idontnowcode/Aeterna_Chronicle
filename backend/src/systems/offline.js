/**
 * 오프라인 보상 시스템 (PRD 9.3)
 * - 기본: 최대 8시간 누적
 * - VIP: 최대 12시간 + 보상량 ×1.5
 */

// 시간당 기본 보상 (임시값 — 경제 밸런스 확정 후 조정)
const HOURLY_REWARDS = {
  gold:  150,
  exp:   120,
};

const MAX_HOURS_NORMAL = 8;
const MAX_HOURS_VIP    = 12;
const VIP_BONUS_MULT   = 1.5;

/**
 * 오프라인 보상 계산
 * @param {Date}    lastLoginAt - 마지막 접속 시각
 * @param {boolean} isVip       - VIP 여부
 * @returns {object} { gold, exp, offlineHours, capped }
 */
function calcOfflineRewards(lastLoginAt, isVip = false) {
  const now        = new Date();
  const diffMs     = now - new Date(lastLoginAt);
  const diffHours  = diffMs / (1000 * 60 * 60);

  const maxHours   = isVip ? MAX_HOURS_VIP : MAX_HOURS_NORMAL;
  const cappedHours = Math.min(diffHours, maxHours);
  const mult        = isVip ? VIP_BONUS_MULT : 1.0;

  const gold = Math.floor(HOURLY_REWARDS.gold * cappedHours * mult);
  const exp  = Math.floor(HOURLY_REWARDS.exp  * cappedHours * mult);

  return {
    gold,
    exp,
    offlineHours: Math.round(cappedHours * 10) / 10,
    capped: diffHours > maxHours,
  };
}

module.exports = { calcOfflineRewards, HOURLY_REWARDS, MAX_HOURS_NORMAL, MAX_HOURS_VIP };
