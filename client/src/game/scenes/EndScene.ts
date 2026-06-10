import Phaser from "phaser";
import { clearSession } from "../network/reconnect";
import { clientState } from "../state/ClientGameState";

export class EndScene extends Phaser.Scene {
  constructor() {
    super("EndScene");
  }

  create(): void {
    const stats = clientState.endStats;
    const room = clientState.room;
    this.add.rectangle(900, 700, 1800, 1400, 0x050e02);
    this.add.text(120, 120, "MATCH COMPLETE", {
      fontFamily: "monospace",
      fontSize: "58px",
      color: "#f0c84d",
      fontStyle: "bold"
    });
    if (!stats && room) {
      this.add.text(120, 240, "The match has ended.", textStyle(30));
      return;
    }
    if (!stats) return;
    const lines = [
      `Winner: ${stats.winner.name}`,
      `Most Eliminations: ${stats.mostEliminations.map((p) => p.name).join(", ")}`,
      `Most Defended Base: ${stats.mostDefendedBase.map((p) => p.name).join(", ")}`,
      `Most Workers Sent: ${stats.mostWorkersSent.map((p) => p.name).join(", ")}`,
      "",
      "Survival Ranking:",
      ...stats.survivalRanking.map((player, index) => `${index + 1}. ${player.name}`)
    ];
    this.add.text(120, 240, lines, textStyle(30));
    const back = this.add.text(1260, 730, "New Game", {
      ...textStyle(28),
      color: "#071924",
      backgroundColor: "#f0c84d",
      padding: { x: 18, y: 12 }
    }).setInteractive({ useHandCursor: true });
    back.setY(1160);
    this.add.text(900, 1325, "© 2026 RineDC. All rights reserved.", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#aac1ca"
    }).setOrigin(0.5);
    back.on("pointerdown", () => {
      clearSession();
      clientState.room = undefined;
      clientState.endStats = undefined;
      this.scene.start("SetupScene");
    });
  }
}

function textStyle(size: number): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "monospace",
    fontSize: `${size}px`,
    color: "#ffffff",
    lineSpacing: 10
  };
}
