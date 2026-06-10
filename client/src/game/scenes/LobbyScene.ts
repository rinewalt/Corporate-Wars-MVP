import Phaser from "phaser";
import { getSocket } from "../network/socket";
import { clearSession } from "../network/reconnect";
import { clientState } from "../state/ClientGameState";
import type { RoomSnapshot } from "../types/shared";

export class LobbyScene extends Phaser.Scene {
  private list?: Phaser.GameObjects.Text;
  private status?: Phaser.GameObjects.Text;
  private startButton?: Phaser.GameObjects.Text;
  private active = false;

  constructor() {
    super("LobbyScene");
  }

  create(): void {
    this.active = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.active = false;
      const socket = getSocket();
      socket.removeAllListeners("roomState");
      socket.removeAllListeners("gameStarted");
      socket.removeAllListeners("hostChanged");
      socket.removeAllListeners("errorMessage");
      socket.removeAllListeners("leftRoom");
    });
    this.add.rectangle(900, 700, 1800, 1400, 0x050e02);
    this.add.text(100, 95, "LOBBY", { fontFamily: "monospace", fontSize: "70px", color: "#f0c84d", fontStyle: "bold" });
    this.list = this.add.text(130, 230, "", { fontFamily: "monospace", fontSize: "30px", color: "#ffffff", lineSpacing: 14 });
    this.status = this.add.text(130, 1230, "", { fontFamily: "monospace", fontSize: "26px", color: "#ffdf75" });
    const ready = this.add.text(1180, 300, "Ready / Unready", buttonStyle()).setInteractive({ useHandCursor: true });
    this.startButton = this.add.text(1180, 415, "Start Game", buttonStyle()).setInteractive({ useHandCursor: true });
    const exit = this.add.text(1180, 530, "Exit", buttonStyle()).setInteractive({ useHandCursor: true });
    this.add.text(900, 1325, "© 2026 RineDC. All rights reserved.", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#aac1ca"
    }).setOrigin(0.5);
    ready.on("pointerdown", () => {
      const me = clientState.room?.players.find((player) => player.id === clientState.playerId);
      getSocket().emit("setReady", { ready: !me?.ready });
    });
    this.startButton.on("pointerdown", () => getSocket().emit("startGame"));
    exit.on("pointerdown", () => this.exitLobby());
    this.registerSocketHandlers();
    this.render();
  }

  private exitLobby(): void {
    getSocket().emit("leaveRoom");
    clearSession();
    clientState.room = undefined;
    clientState.playerId = undefined;
    clientState.reconnectToken = undefined;
    this.scene.start("SetupScene");
  }

  private registerSocketHandlers(): void {
    const socket = getSocket();
    socket.removeAllListeners("roomState");
    socket.removeAllListeners("gameStarted");
    socket.removeAllListeners("hostChanged");
    socket.removeAllListeners("errorMessage");
    socket.on("roomState", (snapshot: RoomSnapshot) => {
      clientState.room = snapshot;
      this.render();
    });
    socket.on("gameStarted", (snapshot: RoomSnapshot) => {
      clientState.room = snapshot;
      this.scene.start("GameScene");
    });
    socket.on("hostChanged", () => this.render());
    socket.on("errorMessage", (payload) => this.status?.setText(payload.message ?? "Action failed."));
  }

  private render(): void {
    const room = clientState.room;
    if (!this.active || !room || !this.list?.active) return;
    const me = room.players.find((player) => player.id === clientState.playerId);
    const allReady = room.players.every((player) => player.ready);
    const canStart = me?.isHost && room.players.length >= 2 && allReady;
    this.startButton?.setVisible(Boolean(me?.isHost));
    this.list.setText([
      `Room Code: ${room.roomCode}`,
      `Players: ${room.players.length}/14`,
      "",
      ...room.players.map((player) => `${player.isHost ? "*" : " "} ${player.name.padEnd(16)} ${player.ready ? "READY" : "WAITING"} ${player.connected ? "" : "OFFLINE"}`),
      "",
      me?.isHost ? `Host controls enabled${canStart ? "" : " after everyone readies."}` : "Waiting for host."
    ]);
  }
}

function buttonStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "monospace",
    fontSize: "28px",
    color: "#071924",
    backgroundColor: "#f0c84d",
    padding: { x: 18, y: 12 },
    fontStyle: "bold"
  };
}
