export interface Point {
  x: number;
  y: number;
}

export interface OfficePathConfig {
  slot: number;
  lotCenterX: number;
  lotCenterY: number;
  buildingOffsetX: number;
  buildingOffsetY: number;
  ceoOffsetX: number;
  ceoOffsetY: number;
  uiOffsetX: number;
  uiOffsetY: number;
  workerSpawnOffsetX: number;
  workerSpawnOffsetY: number;
  lotCenter: Point;
  officePosition: Point;
  buildingOffset: Point;
  spawnPoint: Point;
  roadEntryPoint: Point;
  ringWaypoint: Point;
  ceoOffset: Point;
  color: number;
}

export const GAME_WIDTH = 1800;
export const GAME_HEIGHT = 1400;
export const MAP_BACKGROUND = "#050e02";
export const SHOW_BUILDING_BOUNDS = false;
export const BUILDING_ORIGIN = { x: 0.5, y: 0.62 } as const;

const MAP_SOURCE_WIDTH = 1536;
const MAP_SOURCE_HEIGHT = 1007;
const MAP_SCALE = Math.min(1, GAME_WIDTH / MAP_SOURCE_WIDTH, GAME_HEIGHT / MAP_SOURCE_HEIGHT);
const MAP_OFFSET_X = (GAME_WIDTH - MAP_SOURCE_WIDTH * MAP_SCALE) / 2;
const MAP_OFFSET_Y = (GAME_HEIGHT - MAP_SOURCE_HEIGHT * MAP_SCALE) / 2;

export const MAP_LAYOUT = {
  sourceWidth: MAP_SOURCE_WIDTH,
  sourceHeight: MAP_SOURCE_HEIGHT,
  mapScale: MAP_SCALE,
  mapOffsetX: MAP_OFFSET_X,
  mapOffsetY: MAP_OFFSET_Y,
  worldWidth: MAP_SOURCE_WIDTH * MAP_SCALE,
  worldHeight: MAP_SOURCE_HEIGHT * MAP_SCALE,
  center: { x: MAP_OFFSET_X + 768 * MAP_SCALE, y: MAP_OFFSET_Y + 503 * MAP_SCALE },
  buildingOffsetX: 0,
  buildingOffsetY: 0,
  ceoOffsetX: 0,
  ceoOffsetY: -34
} as const;

const sourceOfficePlacements = [
  { lotCenterX: 384, lotCenterY: 73, buildingOffsetX: 0, buildingOffsetY: 8, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -150, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 768, lotCenterY: 73, buildingOffsetX: 0, buildingOffsetY: 8, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -150, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 1152, lotCenterY: 73, buildingOffsetX: 0, buildingOffsetY: 8, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -150, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 156, lotCenterY: 209, buildingOffsetX: 0, buildingOffsetY: 4, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 72, uiOffsetY: -126, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 1380, lotCenterY: 209, buildingOffsetX: 0, buildingOffsetY: 4, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: -72, uiOffsetY: -126, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 76, lotCenterY: 397, buildingOffsetX: 4, buildingOffsetY: 2, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 96, uiOffsetY: -92, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 1460, lotCenterY: 397, buildingOffsetX: -4, buildingOffsetY: 2, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: -96, uiOffsetY: -92, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 76, lotCenterY: 610, buildingOffsetX: 4, buildingOffsetY: 0, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 100, uiOffsetY: -74, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 1460, lotCenterY: 610, buildingOffsetX: -4, buildingOffsetY: 0, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: -100, uiOffsetY: -74, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 126, lotCenterY: 842, buildingOffsetX: 2, buildingOffsetY: -2, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 78, uiOffsetY: -90, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 446, lotCenterY: 912, buildingOffsetX: 0, buildingOffsetY: -4, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -116, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 768, lotCenterY: 938, buildingOffsetX: 0, buildingOffsetY: -8, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -124, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 1090, lotCenterY: 912, buildingOffsetX: 0, buildingOffsetY: -4, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -116, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 },
  { lotCenterX: 1410, lotCenterY: 842, buildingOffsetX: -2, buildingOffsetY: -2, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: -78, uiOffsetY: -90, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0 }
];

export const PLAYER_COLORS = [
  0x3f8cff,
  0xff4d4d,
  0x58c96f,
  0xffdf4d,
  0x9b5cff,
  0xff9a3d,
  0x42d9ff,
  0xff6fb7,
  0xa7e845,
  0x35c7aa,
  0x9a6b3f,
  0xff43f0,
  0xb8bcc6,
  0xf6bd35
] as const;

export const OFFICE_PATHS: OfficePathConfig[] = sourceOfficePlacements.map((placement, index) => {
  const point = { x: placement.lotCenterX, y: placement.lotCenterY };
  const lotCenter = toWorld(point);
  const officePosition = {
    x: lotCenter.x + placement.buildingOffsetX,
    y: lotCenter.y + placement.buildingOffsetY
  };
  const ringWaypoint = radialPoint(point, 382, 274);
  const spawnPoint = offsetToward(officePosition, ringWaypoint, 46);
  return {
    slot: index,
    ...placement,
    lotCenter,
    officePosition,
    buildingOffset: { x: placement.buildingOffsetX, y: placement.buildingOffsetY },
    spawnPoint: {
      x: spawnPoint.x + placement.workerSpawnOffsetX,
      y: spawnPoint.y + placement.workerSpawnOffsetY
    },
    roadEntryPoint: offsetToward(officePosition, ringWaypoint, 118),
    ringWaypoint,
    ceoOffset: { x: placement.ceoOffsetX, y: placement.ceoOffsetY },
    color: PLAYER_COLORS[index] ?? 0xffffff
  };
});

export const OFFICE_SLOTS = OFFICE_PATHS.map((office) => office.officePosition);

export function routeForSlots(fromSlot: number, toSlot: number): Point[] {
  const from = OFFICE_PATHS[fromSlot];
  const to = OFFICE_PATHS[toSlot];
  if (!from || !to) return [];
  return [
    from.spawnPoint,
    from.roadEntryPoint,
    from.ringWaypoint,
    MAP_LAYOUT.center,
    to.ringWaypoint,
    to.roadEntryPoint,
    to.spawnPoint
  ];
}

export function routeDistance(points: Point[]): number {
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const point = points[index]!;
    distance += Math.hypot(point.x - previous.x, point.y - previous.y);
  }
  return distance;
}

function toWorld(point: Point): Point {
  return {
    x: MAP_OFFSET_X + point.x * MAP_SCALE,
    y: MAP_OFFSET_Y + point.y * MAP_SCALE
  };
}

function radialPoint(point: Point, radiusX: number, radiusY: number): Point {
  const centerSource = { x: 768, y: 503 };
  const dx = point.x - centerSource.x;
  const dy = point.y - centerSource.y;
  const length = Math.hypot(dx, dy) || 1;
  return toWorld({
    x: centerSource.x + (dx / length) * radiusX,
    y: centerSource.y + (dy / length) * radiusY
  });
}

function offsetToward(from: Point, to: Point, amount: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: from.x + (dx / length) * amount,
    y: from.y + (dy / length) * amount
  };
}
