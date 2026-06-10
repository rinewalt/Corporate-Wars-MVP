import { GAME, OFFICE_SLOTS } from "../config/constants.js";
import { id, token } from "../utils/ids.js";
import { clampMin, round2 } from "../utils/safeMath.js";
export class RoomState {
    id;
    code;
    phase = "lobby";
    hostPlayerId = "";
    players = new Map();
    attacks = new Map();
    createdAt = Date.now();
    gameStartedAt = 0;
    endedAt = 0;
    lastWorkerGenerationAt = 0;
    lastSnapshotAt = 0;
    survivalRanking = [];
    constructor(roomId, code) {
        this.id = roomId;
        this.code = code;
    }
    addPlayer(name, gender, socketId) {
        if (this.phase !== "lobby")
            throw new Error("Game already started.");
        if (this.players.size >= GAME.maxPlayers)
            throw new Error("Room is full.");
        const playerId = id("player");
        const player = {
            id: playerId,
            socketId,
            reconnectToken: token(),
            name: sanitizeName(name),
            gender,
            isHost: this.players.size === 0,
            ready: false,
            connected: true,
            eliminated: false,
            officeSlot: this.players.size,
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
        if (player.isHost)
            this.hostPlayerId = player.id;
        const host = this.players.get(this.hostPlayerId);
        if (host && !host.connected)
            this.transferHost();
        return player;
    }
    reconnect(playerId, reconnectToken, socketId) {
        const player = this.players.get(playerId);
        if (!player || player.reconnectToken !== reconnectToken) {
            throw new Error("Reconnect failed.");
        }
        player.socketId = socketId;
        player.connected = true;
        return player;
    }
    disconnect(socketId) {
        const player = [...this.players.values()].find((candidate) => candidate.socketId === socketId);
        if (!player)
            return undefined;
        player.connected = false;
        player.socketId = undefined;
        if (player.id === this.hostPlayerId)
            this.transferHost();
        return player;
    }
    transferHost() {
        for (const player of this.players.values())
            player.isHost = false;
        const nextHost = [...this.players.values()].find((player) => player.connected && !player.eliminated)
            ?? [...this.players.values()].find((player) => !player.eliminated)
            ?? [...this.players.values()][0];
        if (nextHost) {
            nextHost.isHost = true;
            this.hostPlayerId = nextHost.id;
        }
    }
    setReady(playerId, ready) {
        const player = this.requirePlayer(playerId);
        if (this.phase !== "lobby")
            return;
        player.ready = ready;
    }
    canStart(hostPlayerId) {
        if (this.phase !== "lobby" || hostPlayerId !== this.hostPlayerId)
            return false;
        if (this.players.size < GAME.minPlayers || this.players.size > GAME.maxPlayers)
            return false;
        return [...this.players.values()].every((player) => player.ready);
    }
    start(hostPlayerId, now = Date.now()) {
        if (!this.canStart(hostPlayerId))
            throw new Error("Cannot start yet.");
        this.phase = "game";
        this.gameStartedAt = now;
        this.lastWorkerGenerationAt = now;
        for (const player of this.players.values()) {
            player.lastAttackAt = now;
            player.monsterWarningSent = false;
        }
    }
    activeAttackCount(playerId) {
        let count = 0;
        for (const attack of this.attacks.values()) {
            if (!attack.resolved && attack.fromPlayerId === playerId)
                count += 1;
        }
        return count;
    }
    createAttack(fromPlayerId, toPlayerId, now = Date.now()) {
        if (this.phase !== "game")
            throw new Error("Game is not active.");
        const from = this.requirePlayer(fromPlayerId);
        const to = this.requirePlayer(toPlayerId);
        if (from.eliminated)
            throw new Error("Eliminated players cannot attack.");
        if (to.eliminated)
            throw new Error("Target has been eliminated.");
        if (from.id === to.id)
            throw new Error("Cannot attack your own office.");
        if (from.workers <= 0)
            throw new Error("No workers available.");
        if (this.activeAttackCount(from.id) >= GAME.maxActiveMarchingWorkers) {
            throw new Error("Too many active marching workers.");
        }
        from.workers = clampMin(from.workers - 1);
        from.workersSent += 1;
        from.lastAttackAt = now;
        from.monsterWarningSent = false;
        const waypoints = this.routeForSlots(from.officeSlot, to.officeSlot);
        const travelMs = this.travelTime(from.officeSlot, to.officeSlot);
        const attack = {
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
    tick(now = Date.now()) {
        if (this.phase !== "game")
            return { combats: [], monsterWarnings: [], monsterAttacks: [], monsterImpacts: [], ended: undefined };
        this.generateWorkers(now);
        const combats = this.resolveArrivals(now);
        const antiCamping = this.resolveAntiCamping(now);
        const ended = this.checkEnd();
        return { combats, monsterWarnings: antiCamping.warnings, monsterAttacks: antiCamping.attacks, monsterImpacts: antiCamping.impacts, ended };
    }
    generateWorkers(now) {
        if (now - this.lastWorkerGenerationAt < GAME.workerGenerationMs)
            return;
        const steps = Math.floor((now - this.lastWorkerGenerationAt) / GAME.workerGenerationMs);
        this.lastWorkerGenerationAt += steps * GAME.workerGenerationMs;
        for (const player of this.players.values()) {
            if (!player.eliminated)
                player.workers += steps;
        }
    }
    resolveArrivals(now) {
        const ready = [...this.attacks.values()]
            .filter((attack) => !attack.resolved && attack.arrivalTime <= now)
            .sort((a, b) => a.arrivalTime - b.arrivalTime || a.id.localeCompare(b.id));
        const results = [];
        for (const attack of ready) {
            attack.resolved = true;
            this.attacks.delete(attack.id);
            const from = this.players.get(attack.fromPlayerId);
            const to = this.players.get(attack.toPlayerId);
            if (!from || !to || to.eliminated)
                continue;
            let defenderKilled = false;
            let officeDamage = 0;
            let officeDestroyed = false;
            if (to.workers > 0) {
                to.workers = clampMin(to.workers - 1);
                to.defendedCount += 1;
                defenderKilled = true;
            }
            else {
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
    resolveAntiCamping(now) {
        const warnings = [];
        const attacks = [];
        const impacts = [];
        for (const player of this.players.values()) {
            if (player.eliminated)
                continue;
            if (player.monsterImpactAt && now >= player.monsterImpactAt) {
                player.monsterImpactAt = undefined;
                player.officeHp = round2(clampMin(player.officeHp - GAME.monsterDamage));
                impacts.push(player.id);
                if (player.officeHp <= 0)
                    this.eliminatePlayer(player, undefined, now);
                continue;
            }
            if (player.monsterImpactAt)
                continue;
            const idleFor = now - player.lastAttackAt;
            if (!player.monsterWarningSent && idleFor >= GAME.monsterWarningMs) {
                player.monsterWarningSent = true;
                warnings.push(player.id);
            }
            if (idleFor >= GAME.monsterAttackMs) {
                attacks.push(player.id);
                player.monsterImpactAt = now + 2_600;
                player.lastAttackAt = now;
                player.monsterWarningSent = false;
            }
        }
        return { warnings, attacks, impacts };
    }
    eliminatePlayer(target, attacker, now) {
        if (target.eliminated)
            return;
        target.eliminated = true;
        target.officeHp = 0;
        target.workers = 0;
        target.eliminatedAt = now;
        this.survivalRanking.unshift(target.id);
        for (const attack of [...this.attacks.values()]) {
            if (attack.fromPlayerId === target.id)
                this.attacks.delete(attack.id);
        }
        if (attacker && attacker.id !== target.id && !attacker.eliminated) {
            attacker.eliminations += 1;
            attacker.workerAttack = round2(attacker.workerAttack + GAME.attackBonus);
        }
        if (target.id === this.hostPlayerId)
            this.transferHost();
    }
    checkEnd() {
        const alive = [...this.players.values()].filter((player) => !player.eliminated);
        if (this.phase === "game" && alive.length <= 1 && this.players.size >= GAME.minPlayers) {
            const winner = alive[0] ?? [...this.players.values()].sort((a, b) => (b.eliminatedAt ?? 0) - (a.eliminatedAt ?? 0))[0];
            if (!winner)
                return undefined;
            this.phase = "ended";
            this.endedAt = Date.now();
            this.attacks.clear();
            const rankingIds = [winner.id, ...this.survivalRanking.filter((id) => id !== winner.id)];
            return this.endStats(rankingIds);
        }
        return undefined;
    }
    endStats(rankingIds) {
        const players = [...this.players.values()];
        const maxBy = (selector) => {
            const max = Math.max(...players.map(selector));
            return players.filter((player) => selector(player) === max).map(publicPlayer);
        };
        const winner = players.find((player) => !player.eliminated) ?? players[0];
        const ranking = (rankingIds ?? [winner?.id ?? "", ...this.survivalRanking])
            .map((playerId) => this.players.get(playerId))
            .filter((player) => Boolean(player));
        return {
            winner: publicPlayer(winner ?? players[0]),
            mostEliminations: maxBy((player) => player.eliminations),
            mostDefendedBase: maxBy((player) => player.defendedCount),
            mostWorkersSent: maxBy((player) => player.workersSent),
            survivalRanking: ranking.map(publicPlayer)
        };
    }
    snapshot() {
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
    travelTime(fromSlot, toSlot) {
        const distance = routeDistance(this.routeForSlots(fromSlot, toSlot));
        const distances = [];
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
    routeForSlots(fromSlot, toSlot) {
        const from = OFFICE_SLOTS[fromSlot];
        const to = OFFICE_SLOTS[toSlot];
        if (!from || !to)
            return [];
        const fromRing = ringWaypoint(from);
        const toRing = ringWaypoint(to);
        return [
            offsetToward(from, fromRing, 34),
            offsetToward(from, fromRing, 94),
            fromRing,
            { x: 900, y: 755 },
            toRing,
            offsetToward(to, toRing, 94),
            offsetToward(to, toRing, 34)
        ];
    }
    requirePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player)
            throw new Error("Player not found.");
        return player;
    }
}
export function publicPlayer(player) {
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
export function publicAttack(attack) {
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
function sanitizeName(name) {
    const trimmed = name.trim().replace(/\s+/g, " ");
    if (!trimmed)
        return "Player";
    return trimmed.slice(0, 16);
}
function routeDistance(points) {
    let distance = 0;
    for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const point = points[index];
        distance += Math.hypot(point.x - previous.x, point.y - previous.y);
    }
    return distance;
}
function ringWaypoint(point) {
    const center = { x: 900, y: 755 };
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const length = Math.hypot(dx, dy) || 1;
    return {
        x: center.x + (dx / length) * 338,
        y: center.y + (dy / length) * 259
    };
}
function offsetToward(from, to, amount) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    return {
        x: from.x + (dx / length) * amount,
        y: from.y + (dy / length) * amount
    };
}
