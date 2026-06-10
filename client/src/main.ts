import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { SetupScene } from "./game/scenes/SetupScene";
import { LobbyScene } from "./game/scenes/LobbyScene";
import { GameScene } from "./game/scenes/GameScene";
import { EndScene } from "./game/scenes/EndScene";
import "./styles.css";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 1800,
  height: 1400,
  backgroundColor: "#050e02",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, SetupScene, LobbyScene, GameScene, EndScene]
};

new Phaser.Game(config);
