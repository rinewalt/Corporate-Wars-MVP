import Phaser from "phaser";
import { MAP_BACKGROUND, MAP_LAYOUT, OFFICE_SLOTS, routeForSlots } from "../../config/mapPaths";

export { OFFICE_SLOTS, routeForSlots };

export function drawCorporateCity(scene: Phaser.Scene): void {
  scene.add.rectangle(900, 700, 1800, 1400, Phaser.Display.Color.HexStringToColor(MAP_BACKGROUND).color).setDepth(-20);
  scene.add
    .image(900, 700, "master-map-processed")
    .setDisplaySize(MAP_LAYOUT.worldWidth, MAP_LAYOUT.worldHeight)
    .setDepth(-10);
}
