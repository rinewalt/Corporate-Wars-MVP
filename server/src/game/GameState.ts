import { GAME, OFFICE_ROUTE_POINTS, OFFICE_SLOTS } from "../config/constants.js";
import type { EndStats, Gender, PublicAttack, PublicPlayer, RoomPhase, RoomSnapshot } from "../types/shared.js";
import { id, token } from "../utils/ids.js";
import { clampMin, round2 } from "../utils/safeMath.js";

export interface PlayerState {
  id: string;
  socketId: string | undefined;
  reconnectToken: string;
  name: string;
  gender: Gender;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  eliminated: boolean;
  officeSlot: number;
  officeHp: number;
  workers: number;
  workerAttack: number;
  workersSent: number;
  eliminations: number;
  defendedCount: number;
  lastAttackAt: number;
  monsterWarningSent: boolean;
  monsterImpactAt: number | undefined;
  eliminatedAt: number | undefined;
}

export interface AttackState {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  startTime: number;
  arrivalTime: number;
  attackPower: number;
  waypoints: Array<{ x: number; y: number }>;
  resolved: boolean;
}

export interface CombatResult {
  attackId: string;
  fromPlayerId: string;
  toPlayerId: string;
  defenderKilled: boolean;
  officeDamage: number;
  officeDestroyed: boolean;
}

export class RoomState {
  readonly id: string;
  readonly code: string;
  phase: RoomPhase = "lobby";
  hostPlayerId = "";
  players = new Map<string, PlayerState>();
  attacks = new Map<string, AttackState>();
  createdAt = Date.now();
  gameStartedAt = 0;
  endedAt = 0;
  lastWorkerGenerationAt = 0;
  lastSnapshotAt = 0;
  survivalRanking: string[] = [];

  constructor(roomId: string, code: string) {
    this.id = roomId;
    this.code = code;
  }

  addPlayer(name: string, gender: Gender, socketId: string): PlayerState {
    if (this.phase !== "lobby") throw new Error("Game already started.");
    if (this.players.size >= GAME.maxPlayers) throw new Error("Room is full.");
    const playerId = id("player");
    const player: PlayerState = {
      id: playerId,
      socketId,
      reconnectToken: token(),
      name: sanitizeName(name),
      gender,
      isHost: this.players.size === 0,
      ready: false,
      connected: true,
      eliminated: false,
      officeSlot: this.nextOfficeSlot(),
      officeHp: GAME.startingHp,
      workers: GAME.startingWorkers,
      workerAttack: GAME.startingWorkerAttack,
      workersSent: 0,
      eliminations: 0,
      defendedCount: 0,
      lastAttackAt: Date.now(),
      monsterWarningSent: false,
      monsterImpactAt: undefined,
      eliminatedAt: undefined
    };
    this.players.set(player.id, player);
    if (player.isHost) this.hostPlayerId = player.id;
    const host = this.players.get(this.hostPlayerId);
    if (host && !host.connected) this.transferHost();
    return player;
  }

  reconnect(playerId: string, reconnectToken: string, socketId: string): PlayerState {
    const player = this.players.get(playerId);
    if (!player || player.reconnectToken !== reconnectToken) {
      throw new Error("Reconnect failed.");
    }
    player.socketId = socketId;
    player.connected = true;
    return player;
  }

  disconnect(socketId: string): PlayerState | undefined {
    const player = [...this.players.values()].find((candidate) => candidate.socketId === socketId);
    if (!player) return undefined;
    player.connected = false;
    player.socketId = undefined;
    if (player.id === this.hostPlayerId) this.transferHost();
    return player;
  }

  removeLobbyPlayer(playerId: string): PlayerState | undefined {
    if (this.phase !== "lobby") return undefined;
    const player = this.players.get(playerId);
    if (!player) return undefined;
    this.players.delete(playerId);
    if (playerId === this.hostPlayerId) this.transferHost();
    return player;
  }

  transferHost(): void {
    for (const player of this.players.values()) player.isHost = false;
    const nextHost = [...this.players.values()].find((player) => player.connected && !player.eliminated)
      ?? [...this.players.values()].find((player) => !player.eliminated)
      ?? [...this.players.values()][0];
    if (nextHost) {
      nextHost.isHost = true;
      this.hostPlayerId = nextHost.id;
    }
  }

  setReady(playerId: string, ready: boolean): void {
    const player = this.requirePlayer(playerId);
    if (this.phase !== "lobby") return;
    player.ready = ready;
  }

  canStart(hostPlayerId: string): boolean {
    if (this.phase !== "lobby" || hostPlayerId !== this.hostPlayerId) return false;
    if (this.players.size < GAME.minPlayers || this.players.size > GAME.maxPlayers) return false;
    return [...this.players.values()].every((player) => player.ready);
  }

  start(hostPlayerId: string, now = Date.now()): void {
    if (!this.canStart(hostPlayerId)) throw new Error("Cannot start yet.");
    this.phase = "game";
    this.gameStartedAt = now;
    this.lastWorkerGenerationAt = now;
    const shuffledSlots = shuffleSlots();
    let slotIndex = 0;
    for (const player of this.players.values()) {
      player.officeSlot = shuffledSlots[slotIndex] ?? player.officeSlot;
      slotIndex += 1;
      player.lastAttackAt = now;
      player.monsterWarningSent = false;
      player.monsterImpactAt = undefined;
    }
  }

  activeAttackCount(playerId: string): number {
    let count = 0;
    for (const attack of this.attacks.values()) {
      if (!attack.resolved && attack.fromPlayerId === playerId) count += 1;
    }
    return count;
  }

  createAttack(fromPlayerId: string, toPlayerId: string, now = Date.now()): AttackState {
    if (this.phase !== "game") throw new Error("Game is not active.");
    const from = this.requirePlayer(fromPlayerId);
    const to = this.requirePlayer(toPlayerId);
    if (from.eliminated) throw new Error("Eliminated players cannot attack.");
    if (to.eliminated) throw new Error("Target has been eliminated.");
    if (from.id === to.id) throw new Error("Cannot attack your own office.");
    if (from.workers <= 0) throw new Error("No workers available.");
    if (this.activeAttackCount(from.id) >= GAME.maxActiveMarchingWorkers) {
      throw new Error("Too many active marching workers.");
    }

    from.workers = clampMin(from.workers - 1);
    from.workersSent += 1;
    from.lastAttackAt = now;
    from.monsterWarningSent = false;

    const waypoints = this.routeForSlots(from.officeSlot, to.officeSlot);
    const travelMs = this.travelTime(from.officeSlot, to.officeSlot);
    const attack: AttackState = {
      id: id("attack"),
      fromPlayerId: from.id,
      toPlayerId: to.id,
      startTime: now,
      arrivalTime: now + travelMs,
      attackPower: from.workerAttack,
      waypoints,
      resolved: false
    };
    this.attacks.set(attack.id, attack);
    return attack;
  }

  tick(now = Date.now()): { combats: CombatResult[]; monsterWarnings: string[]; monsterAttacks: string[]; monsterImpacts: string[]; ended: EndStats | undefined } {
    if (this.phase !== "game") return { combats: [], monsterWarnings: [], monsterAttacks: [], monsterImpacts: [], ended: undefined };
    this.generateWorkers(now);
    const combats = this.resolveArrivals(now);
    const antiCamping = this.resolveAntiCamping(now);
    const ended = this.checkEnd();
    return { combats, monsterWarnings: antiCamping.warnings, monsterAttacks: antiCamping.attacks, monsterImpacts: antiCamping.impacts, ended };
  }

  generateWorkers(now: number): void {
    if (now - this.lastWorkerGenerationAt < GAME.workerGenerationMs) return;
    const steps = Math.floor((now - this.lastWorkerGenerationAt) / GAME.workerGenerationMs);
    this.lastWorkerGenerationAt += steps * GAME.workerGenerationMs;
    for (const player of this.players.values()) {
      if (!player.eliminated) player.workers += steps;
    }
  }

  resolveArrivals(now: number): CombatResult[] {
    const ready = [...this.attacks.values()]
      .filter((attack) => !attack.resolved && attack.arrivalTime <= now)
      .sort((a, b) => a.arrivalTime - b.arrivalTime || a.id.localeCompare(b.id));
    const results: CombatResult[] = [];
    for (const attack of ready) {
      attack.resolved = true;
      this.attacks.delete(attack.id);
      const from = this.players.get(attack.fromPlayerId);
      const to = this.players.get(attack.toPlayerId);
      if (!from || !to || to.eliminated) continue;

      let defenderKilled = false;
      let officeDamage = 0;
      let officeDestroyed = false;
      if (to.workers > 0) {
        to.workers = clampMin(to.workers - 1);
        to.defendedCount += 1;
        defenderKilled = true;
      } else {
        officeDamage = attack.attackPower;
        to.officeHp = round2(clampMin(to.officeHp - officeDamage));
        if (to.officeHp <= 0) {
          officeDestroyed = true;
          this.eliminatePlayer(to, from, now);
        }
      }
      results.push({ attackId: attack.id, fromPlayerId: from.id, toPlayerId: to.id, defenderKilled, officeDamage, officeDestroyed });
    }
    return results;
  }

  resolveAntiCamping(now: number): { warnings: string[]; attacks: string[]; impacts: string[] } {
    const warnings: string[] = [];
    const attacks: string[] = [];
    const impacts: string[] = [];
    for (const player of this.players.values()) {
      if (player.eliminated) continue;
      if (player.monsterImpactAt && now >= player.monsterImpactAt) {
        player.monsterImpactAt = undefined;
        player.monsterWarningSent = false;
        player.officeHp = round2(clampMin(player.officeHp - GAME.monsterDamage));
        impacts.push(player.id);
        if (player.officeHp <= 0) this.eliminatePlayer(player, undefined, now);
        continue;
      }
      if (player.monsterImpactAt) continue;
      const idleFor = now - player.lastAttackAt;
      if (!player.monsterWarningSent && idleFor >= GAME.inactiveAngryClientDelayMs) {
        player.monsterWarningSent = true;
        warnings.push(player.id);
        attacks.push(player.id);
        player.monsterImpactAt = now + 2_600;
        player.lastAttackAt = now;
      }
    }
    return { warnings, attacks, impacts };
  }

  eliminatePlayer(target: PlayerState, attacker: PlayerState | undefined, now: number): void {
    if (target.eliminated) return;
    target.eliminated = true;
    target.officeHp = 0;
    target.workers = 0;
    target.eliminatedAt = now;
    this.survivalRanking.unshift(target.id);
    for (const attack of [...this.attacks.values()]) {
      if (attack.fromPlayerId === target.id) this.attacks.delete(attack.id);
    }
    if (attacker && attacker.id !== target.id && !attacker.eliminated) {
      attacker.eliminations += 1;
      attacker.workerAttack = round2(attacker.workerAttack + GAME.attackBonus);
    }
    if (target.id === this.hostPlayerId) this.transferHost();
  }

  checkEnd(): EndStats | undefined {
    const alive = [...this.players.values()].filter((player) => !player.eliminated);
    if (this.phase === "game" && alive.length <= 1 && this.players.size >= GAME.minPlayers) {
      const winner = alive[0] ?? [...this.players.values()].sort((a, b) => (b.eliminatedAt ?? 0) - (a.eliminatedAt ?? 0))[0];
      if (!winner) return undefined;
      this.phase = "ended";
      this.endedAt = Date.now();
      this.attacks.clear();
      const rankingIds = [winner.id, ...this.survivalRanking.filter((id) => id !== winner.id)];
      return this.endStats(rankingIds);
    }
    return undefined;
  }

  endStats(rankingIds?: string[]): EndStats {
    const players = [...this.players.values()];
    const maxBy = (selector: (player: PlayerState) => number) => {
      const max = Math.max(...players.map(selector));
      return players.filter((player) => selector(player) === max).map(publicPlayer);
    };
    const winner = players.find((player) => !player.eliminated) ?? players[0];
    const ranking = (rankingIds ?? [winner?.id ?? "", ...this.survivalRanking])
      .map((playerId) => this.players.get(playerId))
      .filter((player): player is PlayerState => Boolean(player));
    return {
      winner: publicPlayer(winner ?? players[0]!),
      mostEliminations: maxBy((player) => player.eliminations),
      mostDefendedBase: maxBy((player) => player.defendedCount),
      mostWorkersSent: maxBy((player) => player.workersSent),
      survivalRanking: ranking.map(publicPlayer)
    };
  }

  snapshot(): RoomSnapshot {
    return {
      roomId: this.id,
      roomCode: this.code,
      phase: this.phase,
      hostPlayerId: this.hostPlayerId,
      players: [...this.players.values()].map(publicPlayer),
      attacks: [...this.attacks.values()].filter((attack) => !attack.resolved).map(publicAttack),
      serverTime: Date.now()
    };
  }

  travelTime(fromSlot: number, toSlot: number): number {
    const distance = routeDistance(this.routeForSlots(fromSlot, toSlot));
    const distances: number[] = [];
    for (let i = 0; i < OFFICE_SLOTS.length; i += 1) {
      for (let j = i + 1; j < OFFICE_SLOTS.length; j += 1) {
        distances.push(routeDistance(this.routeForSlots(i, j)));
      }
    }
    const min = Math.min(...distances);
    const max = Math.max(...distances);
    const normalized = max === min ? 0 : (distance - min) / (max - min);
    return Math.round(GAME.closestTravelMs + normalized * (GAME.furthestTravelMs - GAME.closestTravelMs));
  }

  routeForSlots(fromSlot: number, toSlot: number): Array<{ x: number; y: number }> {
    const from = OFFICE_ROUTE_POINTS[fromSlot];
    const to = OFFICE_ROUTE_POINTS[toSlot];
    if (!from || !to) return [];
    const roadNodes = roadNodesBetween(fromSlot, toSlot);
    const fromRoadEntry = offsetToward(from.officeAttackPoint, from.nearestRoadNode, 42);
    const toRoadEntry = offsetToward(to.officeAttackPoint, to.nearestRoadNode, 42);
    return [
      from.officeAttackPoint,
      fromRoadEntry,
      from.nearestRoadNode,
      ...roadNodes,
      to.nearestRoadNode,
      toRoadEntry,
      to.officeAttackPoint
    ];
  }

  requirePlayer(playerId: string): PlayerState {
    const player = this.players.get(playerId);
    if (!player) throw new Error("Player not found.");
    return player;
  }

  private nextOfficeSlot(): number {
    const used = new Set([...this.players.values()].map((player) => player.officeSlot));
    for (let slot = 0; slot < GAME.maxPlayers; slot += 1) {
      if (!used.has(slot)) return slot;
    }
    return this.players.size;
  }
}

function shuffleSlots(): number[] {
  const slots = Array.from({ length: GAME.maxPlayers }, (_, index) => index);
  for (let index = slots.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = slots[index]!;
    slots[index] = slots[swapIndex]!;
    slots[swapIndex] = current;
  }
  return slots;
}

export function publicPlayer(player: PlayerState): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    gender: player.gender,
    isHost: player.isHost,
    ready: player.ready,
    connected: player.connected,
    eliminated: player.eliminated,
    officeSlot: player.officeSlot,
    officeHp: player.officeHp,
    workers: player.workers,
    workerAttack: player.workerAttack,
    workersSent: player.workersSent,
    eliminations: player.eliminations,
    defendedCount: player.defendedCount
  };
}

export function publicAttack(attack: AttackState): PublicAttack {
  return {
    id: attack.id,
    fromPlayerId: attack.fromPlayerId,
    toPlayerId: attack.toPlayerId,
    startTime: attack.startTime,
    arrivalTime: attack.arrivalTime,
    attackPower: attack.attackPower,
    waypoints: attack.waypoints
  };
}

function sanitizeName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Player";
  return trimmed.slice(0, 16);
}

function routeDistance(points: Array<{ x: number; y: number }>): number {
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const point = points[index]!;
    distance += Math.hypot(point.x - previous.x, point.y - previous.y);
  }
  return distance;
}

const roadLoopSlotOrder: number[] = [0, 1, 2, 4, 6, 8, 13, 12, 11, 10, 9, 7, 5, 3];

function roadNodesBetween(fromSlot: number, toSlot: number): Array<{ x: number; y: number }> {
  const fromIndex = roadLoopSlotOrder.indexOf(fromSlot);
  const toIndex = roadLoopSlotOrder.indexOf(toSlot);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [];
  const clockwise = collectRoadNodes(fromIndex, toIndex, 1);
  const counterClockwise = collectRoadNodes(fromIndex, toIndex, -1);
  const fromNode = OFFICE_ROUTE_POINTS[fromSlot]!.nearestRoadNode;
  const toNode = OFFICE_ROUTE_POINTS[toSlot]!.nearestRoadNode;
  const clockwiseDistance = routeDistance([fromNode, ...clockwise, toNode]);
  const counterClockwiseDistance = routeDistance([fromNode, ...counterClockwise, toNode]);
  return clockwiseDistance <= counterClockwiseDistance ? clockwise : counterClockwise;
}

function collectRoadNodes(fromIndex: number, toIndex: number, direction: 1 | -1): Array<{ x: number; y: number }> {
  const nodes: Array<{ x: number; y: number }> = [];
  let index = fromIndex;
  while (true) {
    index = (index + direction + roadLoopSlotOrder.length) % roadLoopSlotOrder.length;
    if (index === toIndex) break;
    const routePoint = OFFICE_ROUTE_POINTS[roadLoopSlotOrder[index]!];
    if (routePoint) nodes.push(routePoint.nearestRoadNode);
  }
  return nodes;
}

function offsetToward(from: { x: number; y: number }, to: { x: number; y: number }, amount: number): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: from.x + (dx / length) * amount,
    y: from.y + (dy / length) * amount
  };
}
