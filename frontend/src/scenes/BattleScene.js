import Phaser from 'phaser';
import api from '../systems/ApiClient.js';

// v1.0 임시 몬스터 목록 (추후 서버 마스터 데이터 연동)
const AREA_MONSTERS = {
  wood_1: [
    { id: 'slime_lv5',      name: '슬라임',    level: 5,  attribute: 'water', maxHP: 180 },
  ],
  fire_1: [
    { id: 'fire_wolf_lv15', name: '화염 늑대', level: 15, attribute: 'fire',  maxHP: 450 },
  ],
};

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
    this.currentMonster = null;
    this.isBattling = false;
  }

  init(data) {
    this.areaId    = data.areaId    ?? 'wood_1';
    this.character = data.character ?? null;
  }

  create() {
    const { width, height } = this.scale;
    const monsters = AREA_MONSTERS[this.areaId] ?? [];

    // 배경
    this.add.rectangle(width / 2, height / 2, width, height, 0x0d1a0d);
    this.add.rectangle(width / 2, 30, width, 60, 0x111122);
    this.add.text(20, 30, '⚔ 전투', {
      fontSize: '18px', color: '#e8d48b', fontFamily: 'sans-serif',
    }).setOrigin(0, 0.5);

    // 뒤로가기
    const backBtn = this.add.text(width - 20, 30, '← 돌아가기', {
      fontSize: '14px', color: '#8888cc', fontFamily: 'sans-serif',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('WorldScene'));

    // 전투 결과 텍스트
    this._logText = this.add.text(width / 2, height / 2, '', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'sans-serif',
      align: 'center', wordWrap: { width: width - 40 },
    }).setOrigin(0.5);

    // 몬스터 목록
    this.add.text(20, 80, '사냥터 몬스터', {
      fontSize: '16px', color: '#ccccff', fontFamily: 'sans-serif', fontStyle: 'bold',
    });

    monsters.forEach((monster, i) => {
      const y = 120 + i * 80;
      const bg = this.add.rectangle(width / 2, y, width - 30, 64, 0x1a1a2e)
        .setStrokeStyle(1, 0x334455)
        .setInteractive({ useHandCursor: true });

      this.add.text(30, y - 12, monster.name, {
        fontSize: '18px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
      });
      this.add.text(30, y + 10, `Lv.${monster.level} | HP ${monster.maxHP}`, {
        fontSize: '13px', color: '#aaaacc', fontFamily: 'sans-serif',
      });

      bg.on('pointerover',  () => bg.setFillStyle(0x222244));
      bg.on('pointerout',   () => bg.setFillStyle(0x1a1a2e));
      bg.on('pointerdown',  () => this._startBattle(monster));
    });

    // 자동 전투 버튼
    const autoY = height - 80;
    const autoBtn = this.add.rectangle(width / 2, autoY, 200, 48, 0x224422)
      .setInteractive({ useHandCursor: true });
    this._autoBtnText = this.add.text(width / 2, autoY, '⚡ 자동 사냥 시작', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this._autoHunting = false;
    autoBtn.on('pointerdown', () => this._toggleAutoHunt(autoBtn, monsters[0]));
  }

  async _startBattle(monster) {
    if (this.isBattling) return;
    this.isBattling = true;

    this._logText.setText(`${monster.name}과 전투 중...`);
    try {
      const result = await api.startBattle(monster.id);
      const emoji  = result.result === 'win' ? '✅ 승리!' : '❌ 패배';
      let msg = `${emoji} (${result.turns}턴)\n`;

      if (result.result === 'win' && result.rewards) {
        msg += `골드 +${result.rewards.gold} / 경험치 +${result.rewards.exp}`;
        if (result.levelsGained?.length) {
          msg += `\n🎉 레벨 업! → Lv.${result.levelsGained.at(-1)}`;
        }
      }
      this._logText.setText(msg);
    } catch (err) {
      this._logText.setText(`오류: ${err.message}`);
    } finally {
      this.isBattling = false;
    }
  }

  _toggleAutoHunt(btn, monster) {
    if (!monster) return;
    this._autoHunting = !this._autoHunting;

    if (this._autoHunting) {
      btn.setFillStyle(0x442222);
      this._autoBtnText.setText('⏹ 자동 사냥 정지');
      this._autoTimer = this.time.addEvent({
        delay: 2500,
        loop: true,
        callback: () => { if (!this.isBattling) this._startBattle(monster); },
      });
    } else {
      btn.setFillStyle(0x224422);
      this._autoBtnText.setText('⚡ 자동 사냥 시작');
      this._autoTimer?.destroy();
    }
  }

  shutdown() {
    this._autoTimer?.destroy();
  }
}
