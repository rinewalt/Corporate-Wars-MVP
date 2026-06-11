export const GAME = {
  maxPlayers: 14,
  minPlayers: 2,
  startingHp: 100,
  startingWorkers: 10,
  startingWorkerAttack: 2,
  workerHp: 10,
  workerGenerationMs: 5_000,
  maxActiveMarchingWorkers: 100,
  closestTravelMs: 3_000,
  furthestTravelMs: 10_000,
  inactiveAngryClientDelayMs: 12_000,
  monsterDamage: 20,
  attackBonus: 0.25,
  roomCodeLength: 5,
  gameTickMs: 100,
  snapshotMs: 200,
  lobbyTtlMs: 30 * 60_000,
  endedRoomTtlMs: 10 * 60_000,
  disconnectedRoomTtlMs: 10 * 60_000
} as const;

export const OFFICE_SLOTS = [
  { x: 516, y: 277.5 },
  { x: 900, y: 277.5 },
  { x: 1284, y: 277.5 },
  { x: 288, y: 409.5 },
  { x: 1512, y: 409.5 },
  { x: 212, y: 595.5 },
  { x: 1588, y: 595.5 },
  { x: 212, y: 806.5 },
  { x: 1588, y: 806.5 },
  { x: 260, y: 1036.5 },
  { x: 578, y: 1104.5 },
  { x: 900, y: 1126.5 },
  { x: 1222, y: 1104.5 },
  { x: 1540, y: 1036.5 }
] as const;

export const OFFICE_ROUTE_POINTS = [
  { officePosition: { x: 516, y: 277.5 }, nearestRoadNode: { x: 516, y: 346.5 }, officeAttackPoint: { x: 516, y: 329.5 } },
  { officePosition: { x: 900, y: 277.5 }, nearestRoadNode: { x: 900, y: 346.5 }, officeAttackPoint: { x: 900, y: 329.5 } },
  { officePosition: { x: 1284, y: 277.5 }, nearestRoadNode: { x: 1284, y: 346.5 }, officeAttackPoint: { x: 1284, y: 329.5 } },
  { officePosition: { x: 288, y: 409.5 }, nearestRoadNode: { x: 354, y: 448.5 }, officeAttackPoint: { x: 336, y: 432.5 } },
  { officePosition: { x: 1512, y: 409.5 }, nearestRoadNode: { x: 1446, y: 448.5 }, officeAttackPoint: { x: 1464, y: 432.5 } },
  { officePosition: { x: 212, y: 595.5 }, nearestRoadNode: { x: 326, y: 593.5 }, officeAttackPoint: { x: 300, y: 593.5 } },
  { officePosition: { x: 1588, y: 595.5 }, nearestRoadNode: { x: 1474, y: 593.5 }, officeAttackPoint: { x: 1500, y: 593.5 } },
  { officePosition: { x: 212, y: 806.5 }, nearestRoadNode: { x: 326, y: 806.5 }, officeAttackPoint: { x: 300, y: 806.5 } },
  { officePosition: { x: 1588, y: 806.5 }, nearestRoadNode: { x: 1474, y: 806.5 }, officeAttackPoint: { x: 1500, y: 806.5 } },
  { officePosition: { x: 260, y: 1036.5 }, nearestRoadNode: { x: 354, y: 951.5 }, officeAttackPoint: { x: 336, y: 974.5 } },
  { officePosition: { x: 578, y: 1104.5 }, nearestRoadNode: { x: 578, y: 1031.5 }, officeAttackPoint: { x: 578, y: 1048.5 } },
  { officePosition: { x: 900, y: 1126.5 }, nearestRoadNode: { x: 900, y: 1031.5 }, officeAttackPoint: { x: 900, y: 1058.5 } },
  { officePosition: { x: 1222, y: 1104.5 }, nearestRoadNode: { x: 1222, y: 1031.5 }, officeAttackPoint: { x: 1222, y: 1048.5 } },
  { officePosition: { x: 1540, y: 1036.5 }, nearestRoadNode: { x: 1446, y: 951.5 }, officeAttackPoint: { x: 1464, y: 974.5 } }
] as const;
