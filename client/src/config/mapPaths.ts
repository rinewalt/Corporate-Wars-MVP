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
  nearestRoadNodeX: number;
  nearestRoadNodeY: number;
  officeAttackPointX: number;
  officeAttackPointY: number;
  lotCenter: Point;
  officePosition: Point;
  buildingOffset: Point;
  workerSpawnPoint: Point;
  spawnPoint: Point;
  roadEntryPoint: Point;
  nearestRoadNode: Point;
  officeAttackPoint: Point;
  ringWaypoint: Point;
  ceoOffset: Point;
  color: number;
}

export const GAME_WIDTH = 1800;
export const GAME_HEIGHT = 1400;
export const MAP_BACKGROUND = "#050e02";
export const SHOW_BUILDING_BOUNDS = false;
export const SHOW_WORKER_PATHS = false;
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
  { lotCenterX: 384, lotCenterY: 73, buildingOffsetX: 0, buildingOffsetY: 8, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -150, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 384, nearestRoadNodeY: 150, officeAttackPointX: 384, officeAttackPointY: 133 },
  { lotCenterX: 768, lotCenterY: 73, buildingOffsetX: 0, buildingOffsetY: 8, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -150, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 768, nearestRoadNodeY: 150, officeAttackPointX: 768, officeAttackPointY: 133 },
  { lotCenterX: 1152, lotCenterY: 73, buildingOffsetX: 0, buildingOffsetY: 8, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -150, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 1152, nearestRoadNodeY: 150, officeAttackPointX: 1152, officeAttackPointY: 133 },
  { lotCenterX: 156, lotCenterY: 209, buildingOffsetX: 0, buildingOffsetY: 4, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 72, uiOffsetY: -126, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 222, nearestRoadNodeY: 252, officeAttackPointX: 204, officeAttackPointY: 236 },
  { lotCenterX: 1380, lotCenterY: 209, buildingOffsetX: 0, buildingOffsetY: 4, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: -72, uiOffsetY: -126, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 1314, nearestRoadNodeY: 252, officeAttackPointX: 1332, officeAttackPointY: 236 },
  { lotCenterX: 76, lotCenterY: 397, buildingOffsetX: 4, buildingOffsetY: 2, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 96, uiOffsetY: -92, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 194, nearestRoadNodeY: 397, officeAttackPointX: 168, officeAttackPointY: 397 },
  { lotCenterX: 1460, lotCenterY: 397, buildingOffsetX: -4, buildingOffsetY: 2, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: -96, uiOffsetY: -92, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 1342, nearestRoadNodeY: 397, officeAttackPointX: 1368, officeAttackPointY: 397 },
  { lotCenterX: 76, lotCenterY: 610, buildingOffsetX: 4, buildingOffsetY: 0, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 100, uiOffsetY: -74, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 194, nearestRoadNodeY: 610, officeAttackPointX: 168, officeAttackPointY: 610 },
  { lotCenterX: 1460, lotCenterY: 610, buildingOffsetX: -4, buildingOffsetY: 0, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: -100, uiOffsetY: -74, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 1342, nearestRoadNodeY: 610, officeAttackPointX: 1368, officeAttackPointY: 610 },
  { lotCenterX: 126, lotCenterY: 842, buildingOffsetX: 2, buildingOffsetY: -2, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 78, uiOffsetY: -90, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 222, nearestRoadNodeY: 755, officeAttackPointX: 204, officeAttackPointY: 778 },
  { lotCenterX: 446, lotCenterY: 912, buildingOffsetX: 0, buildingOffsetY: -4, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -116, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 446, nearestRoadNodeY: 835, officeAttackPointX: 446, officeAttackPointY: 852 },
  { lotCenterX: 768, lotCenterY: 938, buildingOffsetX: 0, buildingOffsetY: -8, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -124, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 768, nearestRoadNodeY: 835, officeAttackPointX: 768, officeAttackPointY: 862 },
  { lotCenterX: 1090, lotCenterY: 912, buildingOffsetX: 0, buildingOffsetY: -4, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: 0, uiOffsetY: -116, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 1090, nearestRoadNodeY: 835, officeAttackPointX: 1090, officeAttackPointY: 852 },
  { lotCenterX: 1410, lotCenterY: 842, buildingOffsetX: -2, buildingOffsetY: -2, ceoOffsetX: 0, ceoOffsetY: -35, uiOffsetX: -78, uiOffsetY: -90, workerSpawnOffsetX: 0, workerSpawnOffsetY: 0, nearestRoadNodeX: 1314, nearestRoadNodeY: 755, officeAttackPointX: 1332, officeAttackPointY: 778 }
];

const roadLoopSlotOrder = [0, 1, 2, 4, 6, 8, 13, 12, 11, 10, 9, 7, 5, 3];

const angryClientRoadExits = {
  top: toWorld({ x: 768, y: 386 }),
  right: toWorld({ x: 936, y: 503 }),
  bottom: toWorld({ x: 768, y: 620 }),
  left: toWorld({ x: 600, y: 503 })
} as const;

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
  const nearestRoadNode = toWorld({ x: placement.nearestRoadNodeX, y: placement.nearestRoadNodeY });
  const officeAttackPoint = toWorld({ x: placement.officeAttackPointX, y: placement.officeAttackPointY });
  const officePosition = {
    x: lotCenter.x + placement.buildingOffsetX,
    y: lotCenter.y + placement.buildingOffsetY
  };
  const ringWaypoint = nearestRoadNode;
  const spawnPoint = {
    x: officeAttackPoint.x + placement.workerSpawnOffsetX,
    y: officeAttackPoint.y + placement.workerSpawnOffsetY
  };
  return {
    slot: index,
    ...placement,
    lotCenter,
    officePosition,
    buildingOffset: { x: placement.buildingOffsetX, y: placement.buildingOffsetY },
    workerSpawnPoint: spawnPoint,
    spawnPoint,
    roadEntryPoint: offsetToward(spawnPoint, nearestRoadNode, 42),
    nearestRoadNode,
    officeAttackPoint,
    ringWaypoint,
    ceoOffset: { x: placement.ceoOffsetX, y: placement.ceoOffsetY },
    color: PLAYER_COLORS[index] ?? 0xffffff
  };
});

export const OFFICE_SLOTS = OFFICE_PATHS.map((office) => office.officePosition);
export const ANGRY_CLIENT_SPAWN_POINT = MAP_LAYOUT.center;

export function routeForSlots(fromSlot: number, toSlot: number): Point[] {
  const from = OFFICE_PATHS[fromSlot];
  const to = OFFICE_PATHS[toSlot];
  if (!from || !to) return [];
  const roadNodes = roadNodesBetween(fromSlot, toSlot);
  return [
    from.workerSpawnPoint,
    from.roadEntryPoint,
    from.nearestRoadNode,
    ...roadNodes,
    to.nearestRoadNode,
    to.roadEntryPoint,
    to.officeAttackPoint
  ];
}

export function routeForAngryClientToSlot(toSlot: number): Point[] {
  const to = OFFICE_PATHS[toSlot];
  if (!to) return [];
  const roadExit = angryClientRoadExitFor(to.nearestRoadNode);
  const anchorSlot = closestRoadSlotTo(roadExit);
  const anchor = OFFICE_PATHS[anchorSlot];
  if (!anchor) return [ANGRY_CLIENT_SPAWN_POINT, to.roadEntryPoint, to.officeAttackPoint];
  const roadNodes = roadNodesBetween(anchorSlot, toSlot);
  return [
    ANGRY_CLIENT_SPAWN_POINT,
    roadExit,
    anchor.nearestRoadNode,
    ...roadNodes,
    to.nearestRoadNode,
    to.roadEntryPoint,
    to.officeAttackPoint
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

function roadNodesBetween(fromSlot: number, toSlot: number): Point[] {
  const fromIndex = roadLoopSlotOrder.indexOf(fromSlot);
  const toIndex = roadLoopSlotOrder.indexOf(toSlot);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [];
  const clockwise = collectRoadNodes(fromIndex, toIndex, 1);
  const counterClockwise = collectRoadNodes(fromIndex, toIndex, -1);
  const fromNode = OFFICE_PATHS[fromSlot]!.nearestRoadNode;
  const toNode = OFFICE_PATHS[toSlot]!.nearestRoadNode;
  const clockwiseDistance = routeDistance([fromNode, ...clockwise, toNode]);
  const counterClockwiseDistance = routeDistance([fromNode, ...counterClockwise, toNode]);
  return clockwiseDistance <= counterClockwiseDistance ? clockwise : counterClockwise;
}

function collectRoadNodes(fromIndex: number, toIndex: number, direction: 1 | -1): Point[] {
  const nodes: Point[] = [];
  let index = fromIndex;
  while (true) {
    index = (index + direction + roadLoopSlotOrder.length) % roadLoopSlotOrder.length;
    if (index === toIndex) break;
    const office = OFFICE_PATHS[roadLoopSlotOrder[index]!];
    if (office) nodes.push(office.nearestRoadNode);
  }
  return nodes;
}

function angryClientRoadExitFor(target: Point): Point {
  const dx = target.x - ANGRY_CLIENT_SPAWN_POINT.x;
  const dy = target.y - ANGRY_CLIENT_SPAWN_POINT.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? angryClientRoadExits.right : angryClientRoadExits.left;
  return dy > 0 ? angryClientRoadExits.bottom : angryClientRoadExits.top;
}

function closestRoadSlotTo(point: Point): number {
  let bestSlot = roadLoopSlotOrder[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const slot of roadLoopSlotOrder) {
    const office = OFFICE_PATHS[slot];
    if (!office) continue;
    const distance = Math.hypot(office.nearestRoadNode.x - point.x, office.nearestRoadNode.y - point.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSlot = slot;
    }
  }
  return bestSlot;
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
