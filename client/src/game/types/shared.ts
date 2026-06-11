export type Gender = "male" | "female";
export type RoomPhase = "lobby" | "game" | "ended";

export interface PublicPlayer {
  id: string;
  name: string;
  gender: Gender;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  eliminated: boolean;
  slotId: number;
  officeSlot: number;
  officeHp: number;
  workers: number;
  workerAttack: number;
  workersSent: number;
  eliminations: number;
  defendedCount: number;
}

export interface PublicAttack {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  startTime: number;
  arrivalTime: number;
  attackPower: number;
  waypoints: Array<{ x: number; y: number }>;
}

export interface RoomSnapshot {
  roomId: string;
  roomCode: string;
  phase: RoomPhase;
  hostPlayerId: string;
  players: PublicPlayer[];
  attacks: PublicAttack[];
  serverTime: number;
}

export interface EndStats {
  winner: PublicPlayer;
  mostEliminations: PublicPlayer[];
  mostDefendedBase: PublicPlayer[];
  mostWorkersSent: PublicPlayer[];
  survivalRanking: PublicPlayer[];
}
