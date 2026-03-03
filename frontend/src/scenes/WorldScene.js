import Phaser from 'phaser';
import api from '../systems/ApiClient.js';

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
    this.character = null;
    this.offlineRewardClaimed = false;
  }

  async create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0d1a0d);

    // 타이틀 바
    this.add.rectangle(width / 2, 30, width, 60, 0x111122);
    this._titleText = this.add.text(20, 30, '에테르나 크로니클', {
      fontSize: '18px', color: '#e8d48b', fontFamily: 'sans-serif',
    }).setOrigin(0, 0.5);

    // 로딩 중 표시
    const loadingText = this.add.text(width / 2, height / 2, '불러오는 중...', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    try {
      // 오프라인 보상 수령
      const rewardResult = await api.claimOfflineReward();
      this.offlineRewardClaimed = true;

      // 캐릭터 정보 로드
      this.character = await api.getCharacter();
      loadingText.destroy();

      this._buildUI();

      // 오프라인 보상 알림
      if (rewardResult.rewards && rewardResult.rewards.gold > 0) {
        this._showOfflineRewardNotice(rewardResult.rewards);
      }
    } catch (err) {
      if (err.status === 404) {
        // 캐릭터 없음 → 생성 화면
        this.scene.start('CharacterCreateScene');
      } else {
        loadingText.setText(`오류: ${err.message}`);
      }
    }
  }

  _buildUI() {
    const { width, height } = this.scale;
    const char = this.character;

    // 캐릭터 정보 패널
    this.add.rectangle(width / 2, 100, width - 20, 80, 0x1a1a2e, 0.9);
    this.add.text(20, 72, `${char.name}`, {
      fontSize: '20px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    this.add.text(20, 100, `Lv.${char.level}  | ${this._attrLabel(char.attribute)}`, {
      fontSize: '14px', color: '#aaaacc', fontFamily: 'sans-serif',
    });

    const xpRequired = Math.floor(100 * Math.pow(1.15, char.level - 1));
    const xpPct = Math.min(1, char.exp / xpRequired);
    this.add.rectangle(110, 124, 180 * xpPct, 8, 0x5566ff).setOrigin(0, 0.5);
    this.add.rectangle(200, 124, 180, 8, 0x333355, 0.5).setOrigin(0.5);
    this.add.text(20, 120, 'EXP', { fontSize: '10px', color: '#7777cc', fontFamily: 'sans-serif' });

    // 재화 표시 (추후 User API 추가 시 연동)
    this.add.text(width - 20, 72, '골드: ---', {
      fontSize: '14px', color: '#ddbb44', fontFamily: 'sans-serif',
    }).setOrigin(1, 0);

    // 지역 버튼
    this._makeAreaButton(width / 2, 220, '초원의 마을 (Lv.1~20)', 0x1a3322, () => this._enterArea('wood_1'));
    this._makeAreaButton(width / 2, 300, '화염 협곡 (Lv.21~40)',  char.level >= 21 ? 0x331a1a : 0x222222,
      char.level >= 21 ? () => this._enterArea('fire_1') : null, char.level < 21);

    // 하단 메뉴
    const menuY = height - 50;
    this.add.rectangle(width / 2, menuY, width, 80, 0x111122);
    this._makeMenuBtn(80,        menuY, '⚔ 전투',  () => this._openBattle());
    this._makeMenuBtn(width / 2, menuY, '🐾 페트',  () => this._openPets());
    this._makeMenuBtn(width - 80, menuY, '📋 퀘스트', () => this._openQuests());
  }

  _makeAreaButton(x, y, label, color, callback, locked = false) {
    const btn = this.add.rectangle(x, y, 340, 60, color)
      .setStrokeStyle(1, 0x334455);
    if (callback) btn.setInteractive({ useHandCursor: true }).on('pointerdown', callback);
    this.add.text(x, y, locked ? `🔒 ${label}` : label, {
      fontSize: '16px',
      color: locked ? '#555566' : '#ffffff',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  _makeMenuBtn(x, y, label, callback) {
    const btn = this.add.rectangle(x, y, 100, 60, 0x0a0a1a)
      .setInteractive({ useHandCursor: true })
      .on('pointerover',  () => btn.setFillStyle(0x222244))
      .on('pointerout',   () => btn.setFillStyle(0x0a0a1a))
      .on('pointerdown',  callback);
    this.add.text(x, y, label, {
      fontSize: '14px', color: '#ccccff', fontFamily: 'sans-serif',
    }).setOrigin(0.5);
  }

  _enterArea(areaId) {
    this.scene.start('BattleScene', { areaId, character: this.character });
  }

  _openBattle() {
    this.scene.start('BattleScene', { areaId: 'wood_1', character: this.character });
  }

  _openPets() {
    // TODO: PetScene 구현
    alert('페트 화면 — 구현 예정');
  }

  _openQuests() {
    // TODO: QuestScene 구현
    alert('퀘스트 화면 — 구현 예정');
  }

  _showOfflineRewardNotice(rewards) {
    const { width, height } = this.scale;
    const panel = this.add.rectangle(width / 2, height / 2, 300, 180, 0x1a1a3a)
      .setStrokeStyle(2, 0x7788ff)
      .setDepth(100);

    this.add.text(width / 2, height / 2 - 55, '오프라인 보상!', {
      fontSize: '20px', color: '#e8d48b', fontFamily: 'sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    this.add.text(width / 2, height / 2, `골드 +${rewards.gold}\n경험치 +${rewards.exp}`, {
      fontSize: '16px', color: '#ffffff', fontFamily: 'sans-serif', align: 'center',
    }).setOrigin(0.5).setDepth(101);

    const closeBtn = this.add.rectangle(width / 2, height / 2 + 60, 120, 36, 0x335533)
      .setInteractive({ useHandCursor: true }).setDepth(101);
    const closeTxt = this.add.text(width / 2, height / 2 + 60, '수령 완료', {
      fontSize: '14px', color: '#ffffff', fontFamily: 'sans-serif',
    }).setOrigin(0.5).setDepth(102);

    closeBtn.on('pointerdown', () => { panel.destroy(); closeTxt.destroy(); closeBtn.destroy(); });
  }

  _attrLabel(attr) {
    const map = {
      fire: '🔥 화', water: '💧 수', wood: '🌿 목',
      thunder: '⚡ 뇌', earth: '🪨 지', wind: '💨 풍',
    };
    return map[attr] ?? attr;
  }
}
