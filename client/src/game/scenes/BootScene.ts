import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.image("master-map", "/assets/map/map.png");
    this.load.image("player-building", "/assets/map/player-building.png");
    this.load.image("destroyed-player-building", "/assets/map/destroyed-player-building.png");
    this.load.image("ceo-male", "/assets/map/male-ceo.png");
    this.load.image("ceo-female", "/assets/map/female-ceo.png");
    this.load.spritesheet("worker", "/assets/map/worker.png", { frameWidth: 100, frameHeight: 147 });
    this.load.spritesheet("monster-client", "/assets/map/monster-client.png", { frameWidth: 100, frameHeight: 170 });
  }

  create(): void {
    this.textures.get("master-map").setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.createAnimations();
    this.scene.start("SetupScene");
  }

  private createAnimations(): void {
    this.anims.create({
      key: "worker-walk",
      frames: this.anims.generateFrameNumbers("worker", { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: "worker-attack",
      frames: this.anims.generateFrameNumbers("worker", { start: 5, end: 7 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: "monster-client-walk",
      frames: this.anims.generateFrameNumbers("monster-client", { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: "monster-client-attack",
      frames: this.anims.generateFrameNumbers("monster-client", { start: 5, end: 7 }),
      frameRate: 8,
      repeat: 0
    });
  }
}
