/**
 * 전투 시스템 (PRD 7.1)
 * 임시 계수 사용 중 — 밸런스 테스트 후 확정 예정
 */

const { getAttributeMultiplier } = require('../data/attributes');

const CRIT_MULTIPLIER = 1.5;
const DEF_COEFFICIENT  = 0.5; // 임시값

/**
 * 단일 공격 계산
 * @param {object} attacker - { atk, matk, crit, attribute }
 * @param {object} defender - { def, mdef, dodge, attribute }
 * @param {object} skill    - { multiplier, damageType: 'physical'|'magic' }
 * @returns {object} { damage, isCrit, isDodged, attributeRelation }
 */
function calcAttack(attacker, defender, skill = { multiplier: 1.0, damageType: 'physical' }) {
  // 회피 판정
  const isDodged = Math.random() * 100 < (defender.dodge || 0);
  if (isDodged) return { damage: 0, isCrit: false, isDodged: true, attributeRelation: 'neutral' };

  // 속성 보정
  const attrMult = getAttributeMultiplier(attacker.attribute, defender.attribute);
  const relation = attrMult > 1 ? 'strong' : attrMult < 1 ? 'weak' : 'neutral';

  // 치명타 판정
  const isCrit   = Math.random() * 100 < (attacker.crit || 0);
  const critMult = isCrit ? CRIT_MULTIPLIER : 1.0;

  // 데미지 계산
  const atkStat   = skill.damageType === 'magic' ? attacker.matk : attacker.atk;
  const defStat   = skill.damageType === 'magic' ? defender.mdef : defender.def;
  const rawDamage = atkStat * skill.multiplier * attrMult * critMult - defStat * DEF_COEFFICIENT;
  const damage    = Math.max(1, Math.floor(rawDamage));

  return { damage, isCrit, isDodged: false, attributeRelation: relation };
}

/**
 * 콤보 보너스 적용 (PRD 7.4)
 * @param {object} charAttr - 캐릭터 속성
 * @param {object} petAttr  - 페트 속성
 * @returns {object} { comboType, atkBonus, critBonus }
 */
function getComboBonus(charAttr, petAttr) {
  if (charAttr === petAttr) {
    return { comboType: 'same_attribute', atkBonus: 0.20, critBonus: 0 };
  }
  const { getAttributeRelation } = require('../data/attributes');
  if (getAttributeRelation(charAttr, petAttr) === 'strong') {
    return { comboType: 'attribute_combo', atkBonus: 0, critBonus: 15 };
  }
  return { comboType: 'none', atkBonus: 0, critBonus: 0 };
}

/**
 * 자동 전투 AI — 스킬 선택 로직 (PRD 7.3)
 * MP 효율 + 속성 상성 우선
 */
function autoSelectSkill(attacker, defender, skills, currentMP) {
  if (!skills || skills.length === 0) {
    return { multiplier: 1.0, damageType: 'physical', mpCost: 0, name: '기본 공격' };
  }

  // 사용 가능한 스킬 필터 (MP 충분 + 액티브만)
  const usable = skills.filter(
    (s) => s.type === 'active' && currentMP >= s.mpCost
  );

  if (usable.length === 0) {
    return { multiplier: 1.0, damageType: 'physical', mpCost: 0, name: '기본 공격' };
  }

  // 속성 강함인 스킬 우선 → 배율 높은 순
  const relation = getAttributeMultiplier(attacker.attribute, defender.attribute);
  const sorted = usable.sort((a, b) => {
    const aScore = a.multiplier * (relation > 1 ? 1.3 : 1.0);
    const bScore = b.multiplier * (relation > 1 ? 1.3 : 1.0);
    return bScore - aScore;
  });

  return sorted[0];
}

/**
 * 턴제 전투 시뮬레이션
 * @param {object} params.player  - 캐릭터+페트 합산 스탯 및 속성
 * @param {object} params.enemy   - 몬스터 스탯 및 속성
 * @param {boolean} params.auto   - 자동 전투 여부
 * @returns {object} 전투 결과 (승패, 턴 로그, 보상)
 */
function simulateBattle({ player, enemy, auto = true }) {
  const MAX_TURNS = 50;
  const log = [];

  let playerHP = player.stats.hp;
  let enemyHP  = enemy.stats.hp;
  let playerMP = player.stats.mp || 0;

  // 행동 순서: SPD 비교
  const playerGoesFirst = player.stats.spd >= enemy.stats.spd;

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const turnLog = { turn, actions: [] };

    // --- 선공 ---
    const [first, firstHP, second, secondRef] = playerGoesFirst
      ? [player, enemyHP, enemy, 'enemy']
      : [enemy, playerHP, player, 'player'];

    // 공격자 스킬 선택 (자동 전투)
    const firstSkill = auto
      ? autoSelectSkill(first, second, first.skills, first === player ? playerMP : 0)
      : { multiplier: 1.0, damageType: 'physical', mpCost: 0, name: '기본 공격' };

    const firstResult = calcAttack(
      { ...first.stats, attribute: first.attribute },
      { ...second.stats, attribute: second.attribute },
      firstSkill
    );

    if (first === player) playerMP -= (firstSkill.mpCost || 0);

    if (playerGoesFirst) enemyHP  -= firstResult.damage;
    else                  playerHP -= firstResult.damage;

    turnLog.actions.push({
      actor: playerGoesFirst ? 'player' : 'enemy',
      skill: firstSkill.name,
      ...firstResult,
    });

    // 적 사망 체크
    if (enemyHP <= 0) {
      log.push(turnLog);
      return { result: 'win', turns: turn, log, remainingHP: playerHP };
    }

    // --- 후공 ---
    const secondSkill = auto && second === player
      ? autoSelectSkill(second, first, second.skills, playerMP)
      : { multiplier: 1.0, damageType: 'physical', mpCost: 0, name: '기본 공격' };

    const secondResult = calcAttack(
      { ...second.stats, attribute: second.attribute },
      { ...first.stats, attribute: first.attribute },
      secondSkill
    );

    if (second === player) playerMP -= (secondSkill.mpCost || 0);

    if (playerGoesFirst) playerHP -= secondResult.damage;
    else                 enemyHP  -= secondResult.damage;

    turnLog.actions.push({
      actor: playerGoesFirst ? 'enemy' : 'player',
      skill: secondSkill.name,
      ...secondResult,
    });

    log.push(turnLog);

    // MP 소폭 자연 회복 (턴당 5%)
    playerMP = Math.min(player.stats.mp || 0, playerMP + Math.floor((player.stats.mp || 0) * 0.05));

    if (playerHP <= 0) {
      return { result: 'lose', turns: turn, log, remainingHP: 0 };
    }
  }

  // 턴 초과 → 패배 처리
  return { result: 'timeout', turns: MAX_TURNS, log, remainingHP: playerHP };
}

module.exports = { calcAttack, getComboBonus, autoSelectSkill, simulateBattle };
