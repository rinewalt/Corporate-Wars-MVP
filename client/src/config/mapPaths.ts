export interface Point {
  x: number;
  y: number;
}

export interface OfficePathConfig {
  slot: number;
  officePosition: Point;
  spawnPoint: Point;
  roadEntryPoint: Point;
  ringWaypoint: Point;
  ceoOffset: Point;
  color: number;
}

export const GAME_WIDTH = 1800;
export const GAME_HEIGHT = 1400;
export const MAP_BACKGROUND = "#050e02";

export const MAP_LAYOUT = {
  sourceWidth: 1800,
  sourceHeight: 1400,
  scale: 1100 / 1400,
  worldWidth: 1800 * (1100 / 1400),
  worldHeight: 1100,
  offsetX: (1800 - 1800 * (1100 / 1400)) / 2,
  offsetY: 150,
  center: { x: 900, y: 755 }
} as const;

const sourceOffices: Point[] = [
  { x: 500, y: 290 },
  { x: 900, y: 290 },
  { x: 1280, y: 290 },
  { x: 295, y: 435 },
  { x: 1510, y: 435 },
  { x: 260, y: 650 },
  { x: 1540, y: 650 },
  { x: 270, y: 905 },
  { x: 1535, y: 905 },
  { x: 285, y: 1160 },
  { x: 620, y: 1215 },
  { x: 900, y: 1215 },
  { x: 1230, y: 1215 },
  { x: 1520, y: 1160 }
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

export const OFFICE_PATHS: OfficePathConfig[] = sourceOffices.map((point, index) => {
  const officePosition = toWorld(point);
  const ringWaypoint = radialPoint(point, 430, 330);
  return {
    slot: index,
    officePosition,
    spawnPoint: offsetToward(officePosition, ringWaypoint, 34),
    roadEntryPoint: offsetToward(officePosition, ringWaypoint, 94),
    ringWaypoint,
    ceoOffset: { x: 0, y: -36 },
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
    x: MAP_LAYOUT.offsetX + point.x * MAP_LAYOUT.scale,
    y: MAP_LAYOUT.offsetY + point.y * MAP_LAYOUT.scale
  };
}

function radialPoint(point: Point, radiusX: number, radiusY: number): Point {
  const centerSource = { x: 900, y: 770 };
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
