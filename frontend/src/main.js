import Phaser from 'phaser';
import BootScene            from './scenes/BootScene.js';
import MainMenuScene        from './scenes/MainMenuScene.js';
import CharacterCreateScene from './scenes/CharacterCreateScene.js';
import WorldScene           from './scenes/WorldScene.js';
import BattleScene          from './scenes/BattleScene.js';

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 854,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    MainMenuScene,
    CharacterCreateScene,
    WorldScene,
    BattleScene,
  ],
};

new Phaser.Game(config);
