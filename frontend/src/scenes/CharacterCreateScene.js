import Phaser from 'phaser';
import api from '../systems/ApiClient.js';

const ATTRIBUTES = [
  { key: 'fire',    label: '🔥 화(火)', color: 0xff4422, desc: '공격력 특화' },
  { key: 'water',   label: '💧 수(水)', color: 0x2244ff, desc: '힐/지원 특화' },
  { key: 'wood',    label: '🌿 목(木)', color: 0x22aa44, desc: '회복력 특화' },
  { key: 'thunder', label: '⚡ 뇌(雷)', color: 0xffee22, desc: '속도/연타 특화' },
  { key: 'earth',   label: '🪨 지(地)', color: 0xaa7722, desc: '방어/탱커 특화' },
  { key: 'wind',    label: '💨 풍(風)', color: 0x88ddcc, desc: '회피/디버프 특화' },
];

export default class CharacterCreateScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterCreateScene' });
    this.selectedAttribute = null;
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    this.add.text(width / 2, 40, '캐릭터 생성', {
      fontSize: '28px', color: '#e8d48b', fontFamily: 'sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 85, '속성을 선택하세요 (이후 변경 불가)', {
      fontSize: '14px', color: '#888888', fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // 속성 선택 버튼
    this._attrButtons = [];
    ATTRIBUTES.forEach((attr, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 100 + col * 160;
      const y = 160 + row * 120;

      const bg = this.add.rectangle(x, y, 140, 100, 0x111133)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0x333366);

      this.add.text(x, y - 20, attr.label, {
        fontSize: '16px', color: '#ffffff', fontFamily: 'sans-serif',
      }).setOrigin(0.5);

      this.add.text(x, y + 12, attr.desc, {
        fontSize: '11px', color: '#aaaacc', fontFamily: 'sans-serif',
      }).setOrigin(0.5);

      bg.on('pointerdown', () => this._selectAttribute(attr.key, i));
      bg.on('pointerover',  () => { if (this.selectedAttribute !== attr.key) bg.setFillStyle(0x222244); });
      bg.on('pointerout',   () => { if (this.selectedAttribute !== attr.key) bg.setFillStyle(0x111133); });

      this._attrButtons.push({ bg, attr });
    });

    // 이름 입력 안내
    this.add.text(width / 2, height * 0.72, '캐릭터 이름:', {
      fontSize: '16px', color: '#cccccc', fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this._nameDisplay = this.add.text(width / 2, height * 0.79, '이름을 입력하려면 터치하세요', {
      fontSize: '18px', color: '#7777ff', fontFamily: 'sans-serif',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._characterName = '';
    this._nameDisplay.on('pointerdown', () => {
      const name = prompt('캐릭터 이름 (1~16자):');
      if (name && name.length >= 1 && name.length <= 16) {
        this._characterName = name;
        this._nameDisplay.setText(name).setColor('#ffffff');
      }
    });

    // 생성 버튼
    const createBtn = this.add.rectangle(width / 2, height * 0.91, 200, 48, 0x336633)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.91, '모험 시작!', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    createBtn.on('pointerdown', () => this._submitCreate());
  }

  _selectAttribute(key, index) {
    this.selectedAttribute = key;
    this._attrButtons.forEach(({ bg, attr }, i) => {
      if (i === index) {
        bg.setFillStyle(0x334466).setStrokeStyle(3, 0x7788ff);
      } else {
        bg.setFillStyle(0x111133).setStrokeStyle(2, 0x333366);
      }
    });
  }

  async _submitCreate() {
    if (!this.selectedAttribute) return alert('속성을 선택하세요.');
    if (!this._characterName)    return alert('캐릭터 이름을 입력하세요.');

    try {
      await api.createCharacter(this._characterName, this.selectedAttribute);
      this.scene.start('WorldScene');
    } catch (err) {
      alert(`캐릭터 생성 실패: ${err.message}`);
    }
  }
}
