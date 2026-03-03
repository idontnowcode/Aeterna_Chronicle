import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 로딩 바 배경
    const { width, height } = this.scale;
    const barW = 400, barH = 20;
    const x = (width - barW) / 2, y = height / 2;

    this.add.rectangle(x + barW / 2, y, barW, barH, 0x333355);
    const bar = this.add.rectangle(x, y, 0, barH, 0x7777ff).setOrigin(0, 0.5);

    this.add.text(width / 2, y - 40, '에테르나 크로니클', {
      fontSize: '28px', color: '#ffffff', fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this.load.on('progress', (v) => { bar.width = barW * v; });

    // 추후 실제 에셋 등록
    // this.load.image('bg_menu', 'assets/bg_menu.png');
    // this.load.atlas('ui', 'assets/ui.png', 'assets/ui.json');
  }

  create() {
    // 로그인 토큰 확인
    const token = localStorage.getItem('ac_token');
    if (token) {
      this.scene.start('WorldScene');
    } else {
      this.scene.start('MainMenuScene');
    }
  }
}
