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
    this.createProcessedMapTexture();
    this.createAnimations();
    this.scene.start("SetupScene");
  }

  private createProcessedMapTexture(): void {
    const source = this.textures.get("master-map").getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const canvasTexture = this.textures.createCanvas("master-map-processed", source.width, source.height);
    if (!canvasTexture) return;
    const context = canvasTexture.getContext();
    context.drawImage(source, 0, 0);
    const imageData = context.getImageData(0, 0, source.width, source.height);
    const data = imageData.data;
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      const alpha = data[index + 3] ?? 255;
      if (alpha < 8 || (red > 238 && green > 238 && blue > 238)) {
        data[index] = 5;
        data[index + 1] = 14;
        data[index + 2] = 2;
        data[index + 3] = 255;
      }
    }
    context.putImageData(imageData, 0, 0);
    canvasTexture.refresh();
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
