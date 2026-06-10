import Phaser from "phaser";
import { BUILDING_ORIGIN, MAP_BACKGROUND, MAP_LAYOUT, OFFICE_PATHS, OFFICE_SLOTS, routeForSlots, SHOW_BUILDING_BOUNDS } from "../../config/mapPaths";

export { OFFICE_SLOTS, routeForSlots };

export function drawCorporateCity(scene: Phaser.Scene): void {
  scene.add.rectangle(900, 700, 1800, 1400, Phaser.Display.Color.HexStringToColor(MAP_BACKGROUND).color).setDepth(-20);
  scene.add
    .image(MAP_LAYOUT.mapOffsetX, MAP_LAYOUT.mapOffsetY, "master-map")
    .setOrigin(0)
    .setScale(MAP_LAYOUT.mapScale)
    .setDepth(-10);
  if (SHOW_BUILDING_BOUNDS) drawBuildingDebug(scene);
}

function drawBuildingDebug(scene: Phaser.Scene): void {
  for (const office of OFFICE_PATHS) {
    const buildingWidth = 500 * 0.23;
    const buildingHeight = 460 * 0.23;
    const boundsCenterX = office.officePosition.x + buildingWidth * (0.5 - BUILDING_ORIGIN.x);
    const boundsCenterY = office.officePosition.y + buildingHeight * (0.5 - BUILDING_ORIGIN.y);
    scene.add.circle(office.lotCenter.x, office.lotCenter.y, 5, 0xfff44d, 0.95).setDepth(1000);
    scene.add.rectangle(boundsCenterX, boundsCenterY, buildingWidth, buildingHeight, 0x00ff99, 0.08)
      .setStrokeStyle(2, 0x00ff99, 0.85)
      .setDepth(1000);
    scene.add.circle(office.officePosition.x + office.ceoOffset.x, office.officePosition.y + office.ceoOffset.y, 4, 0xff4df0, 0.95).setDepth(1001);
    scene.add.circle(office.spawnPoint.x, office.spawnPoint.y, 4, 0x4dd7ff, 0.95).setDepth(1001);
  }
}
