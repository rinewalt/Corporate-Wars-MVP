import type { EndStats, RoomSnapshot } from "../types/shared";

export class ClientGameState {
  room: RoomSnapshot | undefined;
  playerId: string | undefined;
  reconnectToken: string | undefined;
  endStats: EndStats | undefined;

  setIdentity(playerId: string, reconnectToken: string): void {
    this.playerId = playerId;
    this.reconnectToken = reconnectToken;
  }
}

export const clientState = new ClientGameState();
