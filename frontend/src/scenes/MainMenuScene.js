import Phaser from 'phaser';
import api from '../systems/ApiClient.js';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width, height } = this.scale;

    // 배경
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    // 타이틀
    this.add.text(width / 2, height * 0.25, '에테르나 크로니클', {
      fontSize: '36px',
      color: '#e8d48b',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.35, 'Aeterna Chronicle', {
      fontSize: '18px',
      color: '#8888cc',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // 버튼
    this._makeButton(width / 2, height * 0.55, '시작하기', () => this._handleLogin());
    this._makeButton(width / 2, height * 0.67, '회원가입', () => this._handleRegister());
  }

  _makeButton(x, y, label, callback) {
    const btn = this.add.rectangle(x, y, 220, 48, 0x223366).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: '20px', color: '#ffffff', fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    btn.on('pointerover',  () => btn.setFillStyle(0x3344aa));
    btn.on('pointerout',   () => btn.setFillStyle(0x223366));
    btn.on('pointerdown',  callback);
    return { btn, txt };
  }

  async _handleLogin() {
    // 실제 구현에서는 입력 폼 UI 구성
    // 프로토타입: 콘솔 기반 임시 처리
    const email    = prompt('이메일:');
    const password = prompt('비밀번호:');
    if (!email || !password) return;

    try {
      const { token } = await api.login(email, password);
      api.setToken(token);
      this.scene.start('WorldScene');
    } catch (err) {
      alert(`로그인 실패: ${err.message}`);
    }
  }

  async _handleRegister() {
    const username = prompt('닉네임 (2~20자):');
    const email    = prompt('이메일:');
    const password = prompt('비밀번호 (8자 이상):');
    if (!username || !email || !password) return;

    try {
      const { token } = await api.register(username, email, password);
      api.setToken(token);
      this.scene.start('CharacterCreateScene');
    } catch (err) {
      alert(`회원가입 실패: ${err.message}`);
    }
  }
}
