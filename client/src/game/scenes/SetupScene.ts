import Phaser from "phaser";
import { getSocket, SERVER_URL, SOCKET_SETUP_ERROR } from "../network/socket";
import { clearSession, loadSession, saveSession } from "../network/reconnect";
import { clientState } from "../state/ClientGameState";
import type { Gender, RoomSnapshot } from "../types/shared";

interface RoomEntryPayload {
  roomId?: string;
  playerId: string;
  reconnectToken: string;
  roomState: RoomSnapshot;
}

export class SetupScene extends Phaser.Scene {
  private nameInput?: HTMLInputElement;
  private codeInput?: HTMLInputElement;
  private gender: Gender = "male";
  private status?: Phaser.GameObjects.Text;
  private socketStatus?: Phaser.GameObjects.Text;
  private lastActionText?: Phaser.GameObjects.Text;
  private errorText?: Phaser.GameObjects.Text;
  private debugText?: Phaser.GameObjects.Text;
  private joinButton?: Phaser.GameObjects.Text;
  private lastAction = "Idle";
  private lastError = "";
  private lastSocketError = "";
  private lastServerError = "";
  private joinPending = false;
  private joinEventEmitted = false;
  private serverResponseReceived = false;
  private joinTimeout: number | undefined = undefined;
  private resizeHandler = () => this.positionInputs();
  private readonly handleSetupSocketConnect = () => {
    this.lastSocketError = "";
    this.refreshConnectionStatus();
    this.updateDebugOverlay();
  };
  private readonly handleSetupSocketConnectError = (error: Error) => {
    this.lastSocketError = error.message;
    this.refreshConnectionStatus("Failed");
    this.showSetupError(error.message);
  };
  private readonly handleSetupSocketDisconnect = (reason: string) => {
    this.lastSocketError = reason;
    this.refreshConnectionStatus();
    this.showSetupError("Disconnected from server. Reconnecting...");
  };

  constructor() {
    super("SetupScene");
  }

  create(): void {
    const socket = getSocket();
    this.removeSetupSocketStatusHandlers(socket);
    for (const event of ["roomCreated", "roomJoined", "reconnected", "errorMessage"]) {
      socket.removeAllListeners(event);
    }
    if (new URLSearchParams(window.location.search).get("fresh") === "1") {
      clearSession();
    }
    this.drawBackground();
    this.drawForm();
    this.positionInputs();
    window.addEventListener("resize", this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener("resize", this.resizeHandler));
    this.registerSocketHandlers();
    this.refreshConnectionStatus();
    this.updateDebugOverlay();
    const stored = loadSession();
    if (stored) {
      this.setSetupStatus("Reconnecting...");
      socket.emit("reconnectPlayer", stored);
    }
  }

  shutdown(): void {
    this.nameInput?.remove();
    this.codeInput?.remove();
    this.clearJoinTimeout();
    this.removeSetupSocketStatusHandlers(getSocket());
    window.removeEventListener("resize", this.resizeHandler);
  }

  private drawBackground(): void {
    this.add.rectangle(900, 700, 1800, 1400, 0x050e02);
    this.add.rectangle(900, 700, 620, 660, 0x102634).setStrokeStyle(4, 0xd7e8ef);
    this.add.text(900, 415, "Corporate Wars", {
      fontFamily: "monospace",
      fontSize: "54px",
      color: "#f0c84d",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this.add.text(900, 480, "Enter the City", {
      fontFamily: "monospace",
      fontSize: "30px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this.add.text(650, 505, "Player name", labelStyle());
    this.add.text(650, 600, "Room code optional", labelStyle());
    this.add.text(650, 695, "Gender:", labelStyle());
    this.status = this.add.text(900, 945, "", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#ffdf75",
      align: "center"
    }).setOrigin(0.5);
    this.socketStatus = this.add.text(600, 1035, "Socket: Connecting", debugLineStyle()).setOrigin(0, 0.5);
    this.lastActionText = this.add.text(600, 1070, "Last action: Idle", debugLineStyle()).setOrigin(0, 0.5);
    this.errorText = this.add.text(600, 1105, "Error: none", debugLineStyle()).setOrigin(0, 0.5);
    this.debugText = this.add.text(600, 1150, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#aac1ca",
      lineSpacing: 4
    }).setOrigin(0, 0);
    this.add.text(900, 995, "© 2026 RineDC. All rights reserved.", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#aac1ca"
    }).setOrigin(0.5);
  }

  private drawForm(): void {
    this.nameInput = this.domInput(900, 570, "Player name");
    this.codeInput = this.domInput(900, 665, "Room code optional");

    const male = this.add.text(800, 730, "Male", buttonStyle(true, "gender")).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const female = this.add.text(1000, 730, "Female", buttonStyle(false, "gender")).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const refreshGender = () => {
      male.setStyle(buttonStyle(this.gender === "male", "gender"));
      female.setStyle(buttonStyle(this.gender === "female", "gender"));
    };
    male.on("pointerdown", () => { this.gender = "male"; refreshGender(); });
    female.on("pointerdown", () => { this.gender = "female"; refreshGender(); });

    const create = this.add.text(780, 810, "Create Game", buttonStyle(true, "primary")).setOrigin(0.5);
    const join = this.add.text(1020, 810, "Join Game", buttonStyle(true, "primary")).setOrigin(0.5);
    this.joinButton = join;
    this.makeTouchButton(create, () => this.createRoom(), "create");
    this.makeTouchButton(join, () => this.joinRoom(), "join");
    const reconnect = this.add.text(800, 890, "Reconnect", buttonStyle(false, "secondary")).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const clear = this.add.text(1000, 890, "Clear Saved", buttonStyle(false, "secondary")).setOrigin(0.5).setInteractive({ useHandCursor: true });

    reconnect.on("pointerdown", () => {
      const stored = loadSession();
      if (!stored) return this.showSetupError("No saved session.");
      getSocket().emit("reconnectPlayer", stored);
    });
    clear.on("pointerdown", () => {
      clearSession();
      this.setSetupStatus("Saved session cleared.");
    });
  }

  private makeTouchButton(button: Phaser.GameObjects.Text, action: () => void, label: string): void {
    button.setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(-22, -16, button.width + 44, button.height + 32),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains
    });
    button.on("pointerdown", () => {
      console.info(`[setup] ${label} button pointerdown`);
      if (label === "join") this.setLastAction("Join clicked");
      if (label === "create") this.setLastAction("Create clicked");
    });
    button.on("pointerup", () => {
      console.info(`[setup] ${label} button pointerup`);
      action();
    });
  }

  private domInput(x: number, y: number, placeholder: string): HTMLInputElement {
    const input = document.createElement("input");
    input.placeholder = placeholder;
    input.dataset.gameX = String(x);
    input.dataset.gameY = String(y);
    input.maxLength = placeholder.includes("Room") ? 5 : 16;
    input.autocomplete = "off";
    input.autocapitalize = placeholder.includes("Room") ? "characters" : "words";
    input.inputMode = placeholder.includes("Room") ? "text" : "text";
    input.style.position = "absolute";
    input.style.boxSizing = "border-box";
    input.style.width = "420px";
    input.style.height = "48px";
    input.style.font = "20px monospace";
    input.style.background = "#071924";
    input.style.color = "#fff";
    input.style.border = "2px solid #d7e8ef";
    input.style.padding = "4px 12px";
    if (placeholder.includes("Room")) {
      input.addEventListener("input", () => {
        const cursor = input.selectionStart ?? input.value.length;
        input.value = input.value.trimStart().toUpperCase();
        input.setSelectionRange(Math.min(cursor, input.value.length), Math.min(cursor, input.value.length));
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") input.blur();
      });
    }
    document.body.appendChild(input);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => input.remove());
    return input;
  }

  private positionInputs(): void {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / 1800;
    const scaleY = rect.height / 1400;
    for (const input of [this.nameInput, this.codeInput]) {
      if (!input) continue;
      const gameX = Number(input.dataset.gameX ?? 0);
      const gameY = Number(input.dataset.gameY ?? 0);
      const width = 420 * scaleX;
      const height = 48 * scaleY;
      input.style.left = `${rect.left + gameX * scaleX - width / 2}px`;
      input.style.top = `${rect.top + gameY * scaleY - height / 2}px`;
      input.style.width = `${width}px`;
      input.style.height = `${height}px`;
      input.style.fontSize = `${Math.max(13, 20 * scaleY)}px`;
    }
  }

  private createRoom(): void {
    console.info("[setup] create game clicked");
    this.setLastAction("Create clicked");
    const name = this.nameInput?.value.trim();
    if (!name) {
      console.warn("[setup] create game validation failed", { reason: "missing_name" });
      return this.showSetupError("Enter your player name.");
    }
    const socket = getSocket();
    if (!this.ensureSocketConnected(socket)) return;
    const payload = { name, gender: this.gender };
    this.setLastAction("Create emitted");
    this.setSetupStatus("Creating room...");
    console.info("[setup] create game event emitted", { hasName: true, nameLength: name.length, gender: this.gender });
    socket.emit("createRoom", payload);
  }

  private joinRoom(): void {
    console.info("[setup] join game clicked");
    this.setLastAction("Join clicked");
    if (this.joinPending) {
      console.info("[setup] join ignored while pending");
      return this.setSetupStatus("Joining room...");
    }
    const playerName = this.nameInput?.value.trim() ?? "";
    const roomCode = this.codeInput?.value.trim().toUpperCase() ?? "";
    if (this.codeInput) this.codeInput.value = roomCode;
    if (!playerName) {
      console.warn("[setup] join game validation failed", { reason: "missing_name" });
      return this.showSetupError("Enter your player name.");
    }
    if (!roomCode) {
      console.warn("[setup] join game validation failed", { reason: "missing_room_code" });
      return this.showSetupError("Enter a room code.");
    }
    const socket = getSocket();
    if (!this.ensureSocketConnected(socket)) return;
    this.joinPending = true;
    this.joinEventEmitted = false;
    this.serverResponseReceived = false;
    this.setJoinButtonEnabled(false);
    this.setSetupStatus("Joining room...");
    const payload = { name: playerName, gender: this.gender, roomCode };
    this.joinEventEmitted = true;
    this.setLastAction("Join emitted");
    this.updateDebugOverlay();
    console.info("[setup] join game normalized room code", { roomCode });
    console.info("[setup] join game event emitted", { hasName: true, nameLength: playerName.length, gender: this.gender, roomCode });
    socket.emit("joinRoom", payload);
    this.startJoinTimeout();
  }

  private registerSocketHandlers(): void {
    const socket = getSocket();
    if (SOCKET_SETUP_ERROR) this.showSetupError(SOCKET_SETUP_ERROR);
    socket.on("connect", this.handleSetupSocketConnect);
    socket.on("connect_error", this.handleSetupSocketConnectError);
    socket.on("disconnect", this.handleSetupSocketDisconnect);
    const enterLobby = (eventName: string, payload: RoomEntryPayload) => {
      this.serverResponseReceived = true;
      this.clearJoinTimeout();
      this.joinPending = false;
      this.setJoinButtonEnabled(true);
      this.setLastAction("Server response received");
      const roomId = payload.roomId ?? payload.roomState.roomId;
      console.info(`[setup] ${eventName} server response received`, {
        roomId,
        roomCode: payload.roomState.roomCode,
        playerId: payload.playerId,
        phase: payload.roomState.phase,
        players: payload.roomState.players.length
      });
      clientState.setIdentity(payload.playerId, payload.reconnectToken);
      clientState.room = payload.roomState;
      saveSession({ roomId, playerId: payload.playerId, reconnectToken: payload.reconnectToken });
      this.scene.start(payload.roomState.phase === "game" ? "GameScene" : payload.roomState.phase === "ended" ? "EndScene" : "LobbyScene");
    };
    socket.on("roomCreated", (payload: RoomEntryPayload) => {
      enterLobby("create game", payload);
    });
    socket.on("roomJoined", (payload: RoomEntryPayload) => {
      enterLobby("join game", payload);
    });
    socket.on("reconnected", (payload: RoomEntryPayload) => {
      enterLobby("reconnect", payload);
    });
    socket.on("errorMessage", (payload: { code?: string; message?: string }) => {
      console.warn("[setup] server error response received", payload);
      this.serverResponseReceived = true;
      this.clearJoinTimeout();
      this.joinPending = false;
      this.setJoinButtonEnabled(true);
      this.setLastAction("Server response received");
      this.lastServerError = payload.message ?? "Connection error.";
      this.showSetupError(toSetupErrorMessage(this.lastServerError));
    });
  }

  private ensureSocketConnected(socket: ReturnType<typeof getSocket>): boolean {
    this.refreshConnectionStatus();
    if (SOCKET_SETUP_ERROR) {
      this.showSetupError(SOCKET_SETUP_ERROR);
      return false;
    }
    if (!socket.connected) {
      console.warn("[setup] socket not connected before emit", { socketId: socket.id, serverUrl: SERVER_URL });
      this.setSetupStatus("Connecting to server. Please wait.");
      this.showSetupError("Not connected to server yet. Please wait.");
      this.updateDebugOverlay();
      return false;
    }
    return true;
  }

  private removeSetupSocketStatusHandlers(socket: ReturnType<typeof getSocket>): void {
    socket.off("connect", this.handleSetupSocketConnect);
    socket.off("connect_error", this.handleSetupSocketConnectError);
    socket.off("disconnect", this.handleSetupSocketDisconnect);
  }

  private startJoinTimeout(): void {
    this.clearJoinTimeout();
    this.joinTimeout = window.setTimeout(() => {
      if (!this.joinPending || this.serverResponseReceived) return;
      console.warn("[setup] join timeout", {
        socketConnected: getSocket().connected,
        joinEventEmitted: this.joinEventEmitted,
        serverResponseReceived: this.serverResponseReceived,
        lastSocketError: this.lastSocketError,
        lastServerError: this.lastServerError
      });
      this.joinPending = false;
      this.setJoinButtonEnabled(true);
      this.showSetupError("Server did not respond. Check your connection and try again.");
      this.updateDebugOverlay();
    }, 5_000);
  }

  private clearJoinTimeout(): void {
    if (this.joinTimeout === undefined) return;
    window.clearTimeout(this.joinTimeout);
    this.joinTimeout = undefined;
  }

  private setJoinButtonEnabled(enabled: boolean): void {
    this.joinButton?.setAlpha(enabled ? 1 : 0.55);
  }

  private refreshConnectionStatus(forcedState?: "Failed"): void {
    const socket = getSocket();
    const state = forcedState ?? (socket.connected ? "Connected" : SOCKET_SETUP_ERROR ? "Failed" : "Connecting");
    this.socketStatus?.setText(`Socket: ${state}`);
    this.socketStatus?.setColor(state === "Connected" ? "#78f07d" : state === "Failed" ? "#ff7d7d" : "#ffdf75");
  }

  private setLastAction(action: string): void {
    this.lastAction = action;
    this.lastActionText?.setText(`Last action: ${action}`);
    this.updateDebugOverlay();
  }

  private setSetupStatus(text: string): void {
    this.status?.setColor("#ffdf75");
    this.status?.setText(text);
    this.updateDebugOverlay();
  }

  private showSetupError(message: string): void {
    this.lastError = message;
    this.status?.setColor("#ff7d7d");
    this.status?.setText(message);
    this.errorText?.setText(`Error: ${message}`);
    this.updateDebugOverlay();
  }

  private updateDebugOverlay(): void {
    const socket = getSocket();
    this.debugText?.setText([
      `server URL: ${SERVER_URL || "(missing VITE_SERVER_URL)"}`,
      `socket connected: ${socket.connected}`,
      `socket id: ${socket.id ?? "(none)"}`,
      `last action: ${this.lastAction}`,
      `join event emitted: ${this.joinEventEmitted}`,
      `server response received: ${this.serverResponseReceived}`,
      `last socket error: ${this.lastSocketError || "none"}`,
      `last server error: ${this.lastServerError || "none"}`,
      `last error: ${this.lastError || "none"}`
    ]);
  }
}

function labelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "monospace",
    fontSize: "18px",
    color: "#d7e8ef",
    fontStyle: "bold"
  };
}

function debugLineStyle(): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "monospace",
    fontSize: "16px",
    color: "#aac1ca"
  };
}

function toSetupErrorMessage(message: string): string {
  const normalized = message.trim().replace(/\.$/, "");
  if (normalized === "Room not found") return "Room not found. Check the room code.";
  if (normalized === "Room full") return "Room is full.";
  if (normalized === "Room already started") return "Game already started.";
  return message;
}

function buttonStyle(active: boolean, size: "primary" | "secondary" | "gender"): Phaser.Types.GameObjects.Text.TextStyle {
  const fontSize = size === "secondary" ? "20px" : "24px";
  const padding = size === "secondary" ? { x: 12, y: 8 } : { x: 18, y: 10 };
  return {
    fontFamily: "monospace",
    fontSize,
    color: active ? "#071924" : "#ffffff",
    backgroundColor: active ? "#f0c84d" : "#183544",
    padding,
    fontStyle: "bold"
  };
}
