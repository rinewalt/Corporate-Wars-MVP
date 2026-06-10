import Phaser from "phaser";
import { BUILDING_ORIGIN, MAP_BACKGROUND, MAP_LAYOUT, OFFICE_PATHS, OFFICE_SLOTS, routeForSlots, SHOW_BUILDING_BOUNDS, SHOW_WORKER_PATHS } from "../../config/mapPaths";

export { OFFICE_SLOTS, routeForSlots };

export function drawCorporateCity(scene: Phaser.Scene): void {
  scene.add.rectangle(900, 700, 1800, 1400, Phaser.Display.Color.HexStringToColor(MAP_BACKGROUND).color).setDepth(-20);
  scene.add
    .image(MAP_LAYOUT.mapOffsetX, MAP_LAYOUT.mapOffsetY, "master-map")
    .setOrigin(0)
    .setScale(MAP_LAYOUT.mapScale)
    .setDepth(-10);
  if (SHOW_BUILDING_BOUNDS) drawBuildingDebug(scene);
  if (SHOW_WORKER_PATHS) drawWorkerPathDebug(scene);
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

function drawWorkerPathDebug(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics().setDepth(1002);
  graphics.lineStyle(3, 0xffd84d, 0.7);
  for (let index = 0; index < OFFICE_PATHS.length; index += 1) {
    const next = (index + 1) % OFFICE_PATHS.length;
    const path = routeForSlots(index, next);
    if (path.length < 2) continue;
    graphics.beginPath();
    graphics.moveTo(path[0]!.x, path[0]!.y);
    for (const point of path.slice(1)) graphics.lineTo(point.x, point.y);
    graphics.strokePath();
  }

  for (const office of OFFICE_PATHS) {
    scene.add.circle(office.nearestRoadNode.x, office.nearestRoadNode.y, 5, 0xffd84d, 0.95).setDepth(1003);
    scene.add.circle(office.roadEntryPoint.x, office.roadEntryPoint.y, 5, 0x44ffcc, 0.95).setDepth(1003);
    scene.add.circle(office.officeAttackPoint.x, office.officeAttackPoint.y, 5, 0xff6b4d, 0.95).setDepth(1003);
  }
}
