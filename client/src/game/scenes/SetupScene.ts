import Phaser from "phaser";
import { getSocket } from "../network/socket";
import { clearSession, loadSession, saveSession } from "../network/reconnect";
import { clientState } from "../state/ClientGameState";
import type { Gender, RoomSnapshot } from "../types/shared";

export class SetupScene extends Phaser.Scene {
  private nameInput?: HTMLInputElement;
  private codeInput?: HTMLInputElement;
  private gender: Gender = "male";
  private status?: Phaser.GameObjects.Text;
  private resizeHandler = () => this.positionInputs();

  constructor() {
    super("SetupScene");
  }

  create(): void {
    const socket = getSocket();
    socket.removeAllListeners();
    if (new URLSearchParams(window.location.search).get("fresh") === "1") {
      clearSession();
    }
    this.drawBackground();
    this.drawForm();
    this.positionInputs();
    window.addEventListener("resize", this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener("resize", this.resizeHandler));
    this.registerSocketHandlers();
    const stored = loadSession();
    if (stored) {
      this.setStatus("Reconnecting...");
      socket.emit("reconnectPlayer", stored);
    }
  }

  shutdown(): void {
    this.nameInput?.remove();
    this.codeInput?.remove();
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

    const create = this.add.text(780, 810, "Create Game", buttonStyle(true, "primary")).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const join = this.add.text(1020, 810, "Join Game", buttonStyle(true, "primary")).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const reconnect = this.add.text(800, 890, "Reconnect", buttonStyle(false, "secondary")).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const clear = this.add.text(1000, 890, "Clear Saved", buttonStyle(false, "secondary")).setOrigin(0.5).setInteractive({ useHandCursor: true });

    create.on("pointerdown", () => this.createRoom());
    join.on("pointerdown", () => this.joinRoom());
    reconnect.on("pointerdown", () => {
      const stored = loadSession();
      if (!stored) return this.setStatus("No saved session.");
      getSocket().emit("reconnectPlayer", stored);
    });
    clear.on("pointerdown", () => {
      clearSession();
      this.setStatus("Saved session cleared.");
    });
  }

  private domInput(x: number, y: number, placeholder: string): HTMLInputElement {
    const input = document.createElement("input");
    input.placeholder = placeholder;
    input.dataset.gameX = String(x);
    input.dataset.gameY = String(y);
    input.maxLength = placeholder.includes("Room") ? 5 : 16;
    input.style.position = "absolute";
    input.style.boxSizing = "border-box";
    input.style.width = "420px";
    input.style.height = "48px";
    input.style.font = "20px monospace";
    input.style.background = "#071924";
    input.style.color = "#fff";
    input.style.border = "2px solid #d7e8ef";
    input.style.padding = "4px 12px";
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
    const name = this.nameInput?.value.trim();
    if (!name) return this.setStatus("Name required.");
    getSocket().emit("createRoom", { name, gender: this.gender });
  }

  private joinRoom(): void {
    const name = this.nameInput?.value.trim();
    const roomCode = this.codeInput?.value.trim().toUpperCase();
    if (!name || !roomCode) return this.setStatus("Name and room code required.");
    getSocket().emit("joinRoom", { name, gender: this.gender, roomCode });
  }

  private registerSocketHandlers(): void {
    const socket = getSocket();
    const enterLobby = (payload: { roomId: string; playerId: string; reconnectToken: string; roomState: RoomSnapshot }) => {
      clientState.setIdentity(payload.playerId, payload.reconnectToken);
      clientState.room = payload.roomState;
      saveSession({ roomId: payload.roomId, playerId: payload.playerId, reconnectToken: payload.reconnectToken });
      this.scene.start(payload.roomState.phase === "game" ? "GameScene" : payload.roomState.phase === "ended" ? "EndScene" : "LobbyScene");
    };
    socket.on("roomCreated", enterLobby);
    socket.on("roomJoined", enterLobby);
    socket.on("reconnected", enterLobby);
    socket.on("errorMessage", (payload) => this.setStatus(payload.message ?? "Connection error."));
  }

  private setStatus(text: string): void {
    this.status?.setText(text);
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
