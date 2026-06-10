import Phaser from "phaser";
import { getSocket } from "../network/socket";
import { clearSession } from "../network/reconnect";
import { BUILDING_ORIGIN, OFFICE_PATHS, routeForSlots, SHOW_WORKER_PATHS } from "../../config/mapPaths";
import { drawCorporateCity, OFFICE_SLOTS } from "../render/MapRenderer";
import { clientState } from "../state/ClientGameState";
import type { EndStats, PublicAttack, PublicPlayer, RoomSnapshot } from "../types/shared";

interface OfficeView {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  building: Phaser.GameObjects.Image;
  hitArea: Phaser.GameObjects.Rectangle;
  ceo: Phaser.GameObjects.Image;
  panel: Phaser.GameObjects.Rectangle;
  popup?: Phaser.GameObjects.Text;
}

type AnnouncementType = "warning" | "info" | "success" | "danger";

export class GameScene extends Phaser.Scene {
  private offices = new Map<string, OfficeView>();
  private activeWorkers = new Set<string>();
  private announcementLayer: Phaser.GameObjects.Container | undefined;
  private currentAnnouncement: Phaser.GameObjects.Container | undefined;
  private exitDialog: Phaser.GameObjects.Container | undefined;
  private active = false;

  constructor() {
    super("GameScene");
  }

  create(): void {
    this.active = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.active = false;
      const socket = getSocket();
      for (const event of ["gameStateSnapshot", "attackAccepted", "workerArrived", "monsterWarning", "monsterAttack", "monsterImpact", "gameEnded", "errorMessage", "leftRoom"]) {
        socket.removeAllListeners(event);
      }
    });
    drawCorporateCity(this);
    this.cameras.main.setBounds(0, 0, 1800, 1400);
    this.announcementLayer = this.add.container(0, 0).setDepth(99999).setScrollFactor(0);
    this.add.text(1640, 42, "Exit", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#071924",
      backgroundColor: "#f0c84d",
      padding: { x: 16, y: 9 },
      fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(99998).setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.showExitConfirmation());
    this.registerSocketHandlers();
    this.renderSnapshot(clientState.room);
  }

  private registerSocketHandlers(): void {
    const socket = getSocket();
    for (const event of ["gameStateSnapshot", "attackAccepted", "workerArrived", "monsterWarning", "monsterAttack", "monsterImpact", "gameEnded", "errorMessage", "leftRoom"]) {
      socket.removeAllListeners(event);
    }
    socket.on("gameStateSnapshot", (snapshot: RoomSnapshot) => this.renderSnapshot(snapshot));
    socket.on("attackAccepted", (attack: PublicAttack) => this.animateAttack(attack));
    socket.on("monsterWarning", ({ playerId }) => {
      this.showAnnouncement("⚠ ANGRY CLIENT INCOMING! ⚠", 3000, "warning");
    });
    socket.on("monsterAttack", ({ playerId }) => this.animateMonster(playerId));
    socket.on("monsterImpact", ({ playerId }) => this.showOfficePopup(playerId, "-20 HP", 0xff7d7d));
    socket.on("gameEnded", (stats: EndStats) => {
      clientState.endStats = stats;
      this.scene.start("EndScene");
    });
    socket.on("errorMessage", (payload) => this.showAnnouncement(payload.message ?? "Action failed.", 3000, "danger"));
    socket.on("leftRoom", () => this.returnToSetup());
  }

  private showExitConfirmation(): void {
    if (this.exitDialog) {
      this.exitDialog.destroy();
      this.exitDialog = undefined;
    }
    const overlay = this.add.rectangle(900, 700, 1800, 1400, 0x000000, 0.52);
    const panel = this.add.rectangle(900, 700, 690, 260, 0x102634, 0.98).setStrokeStyle(4, 0xd7e8ef);
    const message = this.add.text(900, 640, "Are you sure you want to exit the match?", {
      fontFamily: "monospace",
      fontSize: "26px",
      color: "#ffffff",
      align: "center",
      fontStyle: "bold",
      wordWrap: { width: 600 }
    }).setOrigin(0.5);
    const cancel = this.add.text(760, 750, "Cancel", dialogButtonStyle(false)).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const exit = this.add.text(1040, 750, "Exit Match", dialogButtonStyle(true)).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.exitDialog = this.add.container(0, 0, [overlay, panel, message, cancel, exit]).setDepth(100000).setScrollFactor(0);
    cancel.on("pointerdown", () => {
      this.exitDialog?.destroy();
      this.exitDialog = undefined;
    });
    exit.on("pointerdown", () => {
      getSocket().emit("leaveRoom");
      this.returnToSetup();
    });
  }

  private returnToSetup(): void {
    clearSession();
    clientState.room = undefined;
    clientState.endStats = undefined;
    clientState.playerId = undefined;
    clientState.reconnectToken = undefined;
    this.scene.start("SetupScene");
  }

  private renderSnapshot(snapshot?: RoomSnapshot): void {
    if (!this.active || !snapshot) return;
    clientState.room = snapshot;
    for (const player of snapshot.players) this.renderOffice(player);
  }

  private renderOffice(player: PublicPlayer): void {
    const slot = OFFICE_SLOTS[player.officeSlot];
    if (!slot) return;
    let view = this.offices.get(player.id);
    if (!view) {
      const container = this.add.container(slot.x, slot.y).setDepth(slot.y);
      const building = this.add.image(0, 0, "player-building")
        .setOrigin(BUILDING_ORIGIN.x, BUILDING_ORIGIN.y)
        .setScale(0.23)
        .setDepth(0);
      const pathConfig = OFFICE_PATHS[player.officeSlot];
      const offset = pathConfig?.ceoOffset ?? { x: 0, y: -36 };
      const ceo = this.add.image(offset.x, offset.y, player.gender === "female" ? "ceo-female" : "ceo-male")
        .setScale(0.14)
        .setOrigin(0.5, 1)
        .setDepth(2);
      const labelOffset = pathConfig ? { x: pathConfig.uiOffsetX, y: pathConfig.uiOffsetY } : safeLabelOffset(slot);
      const panel = this.add.rectangle(labelOffset.x, labelOffset.y, 156, 92, 0x162436, 0.96).setStrokeStyle(2, pathConfig?.color ?? 0xe4ecf1);
      const label = this.add.text(labelOffset.x, labelOffset.y, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        align: "center",
        fontStyle: "bold"
      }).setOrigin(0.5);
      const hitArea = this.add.rectangle(0, 0, 112, 104, 0x3de7ff, 0.001);
      container.add([building, ceo, hitArea, panel, label]);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on("pointerdown", () => this.attack(player.id));
      view = { container, label, building, hitArea, ceo, panel };
      this.offices.set(player.id, view);
    }
    const pathConfig = OFFICE_PATHS[player.officeSlot];
    const tint = pathConfig?.color ?? 0xffffff;
    view.label.setText(`${player.name}\n\n👥 ${player.workers}\n❤️ ${Math.ceil(player.officeHp)}`);
    view.label.setColor(colorToCss(tint));
    view.panel.setStrokeStyle(2, tint);
    view.building.setTexture(player.eliminated ? "destroyed-player-building" : "player-building");
    view.building.setTint(player.eliminated ? 0x777777 : tint);
    view.hitArea.setAlpha(player.eliminated ? 0.02 : 0.001);
    view.ceo.setVisible(!player.eliminated);
    view.ceo.setTexture(player.gender === "female" ? "ceo-female" : "ceo-male");
    view.container.setAlpha(player.connected ? 1 : 0.72);
  }

  private attack(targetPlayerId: string): void {
    const room = clientState.room;
    const me = room?.players.find((player) => player.id === clientState.playerId);
    const target = room?.players.find((player) => player.id === targetPlayerId);
    if (!me || !target || me.eliminated || target.eliminated || me.id === target.id) return;
    getSocket().emit("attackOffice", { targetPlayerId });
  }

  private animateAttack(attack: PublicAttack): void {
    if (!this.active) return;
    if (this.activeWorkers.has(attack.id)) return;
    const room = clientState.room;
    const from = room?.players.find((player) => player.id === attack.fromPlayerId);
    const to = room?.players.find((player) => player.id === attack.toPlayerId);
    if (!from || !to) return;
    const fromSlot = OFFICE_SLOTS[from.officeSlot];
    const toSlot = OFFICE_SLOTS[to.officeSlot];
    if (!fromSlot || !toSlot) return;
    this.activeWorkers.add(attack.id);
    const elapsed = Math.max(0, Date.now() - attack.startTime);
    const duration = Math.max(120, attack.arrivalTime - attack.startTime - elapsed);
    const path = attack.waypoints.length > 0 ? attack.waypoints : routeForSlots(from.officeSlot, to.officeSlot);
    if (path.length === 0) {
      this.activeWorkers.delete(attack.id);
      return;
    }
    const startPoint = path[0]!;
    const worker = this.add.sprite(startPoint.x, startPoint.y, "worker").setScale(0.34).setDepth(1200);
    worker.play("worker-walk");
    const debugPath = SHOW_WORKER_PATHS ? this.drawAttackPathDebug(path) : undefined;
    this.followPath(worker, path, duration, () => {
      worker.play("worker-attack");
      worker.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.activeWorkers.delete(attack.id);
        debugPath?.destroy();
        worker.destroy();
      });
    });
  }

  private animateMonster(playerId: string): void {
    if (!this.active) return;
    const player = clientState.room?.players.find((candidate) => candidate.id === playerId);
    if (!player) return;
    const slot = OFFICE_SLOTS[player.officeSlot];
    if (!slot) return;
    const pathConfig = OFFICE_PATHS[player.officeSlot];
    const targetEntry = pathConfig?.roadEntryPoint ?? slot;
    const targetPoint = pathConfig?.officeAttackPoint ?? slot;
    const monsterStart = { x: targetEntry.x - 170, y: targetEntry.y - 95 };
    const monsterPath = [monsterStart, targetEntry, targetPoint];
    const monster = this.add.sprite(monsterStart.x, monsterStart.y, "monster-client").setScale(0.52).setDepth(1300);
    monster.play("monster-client-walk");
    this.followPath(monster, monsterPath, 2600, () => {
      monster.setDepth(1400);
      this.time.delayedCall(250, () => {
        monster.play("monster-client-attack");
        monster.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => monster.destroy());
      });
    });
  }

  private showAnnouncement(text: string, duration = 3000, type: AnnouncementType = "info"): void {
    if (!this.active) return;
    const color = announcementColor(type);
    const layer = this.announcementLayer ?? this.add.container(0, 0).setDepth(99999).setScrollFactor(0);
    this.announcementLayer = layer;

    if (this.currentAnnouncement) {
      this.tweens.killTweensOf(this.currentAnnouncement);
      this.currentAnnouncement.destroy();
      this.currentAnnouncement = undefined;
    }

    const message = this.add.text(900, 92, text, {
      fontFamily: "monospace",
      fontSize: "38px",
      color,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 8,
      shadow: {
        offsetX: 4,
        offsetY: 4,
        color: "#000000",
        blur: 0,
        fill: true
      }
    }).setOrigin(0.5).setDepth(1);

    const width = Math.max(620, message.width + 72);
    const panel = this.add.rectangle(900, 92, width, 82, 0x000000, 0.75)
      .setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(color).color, 0.95)
      .setDepth(0);

    const announcement = this.add.container(0, 0, [panel, message])
      .setDepth(99999)
      .setScrollFactor(0)
      .setAlpha(0)
      .setScale(0.94);
    layer.add(announcement);
    this.currentAnnouncement = announcement;

    this.tweens.add({
      targets: announcement,
      alpha: 1,
      scale: 1.04,
      duration: 180,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: announcement,
          scale: 1,
          duration: 120,
          ease: "Sine.easeOut"
        });
      }
    });
    this.time.delayedCall(duration, () => {
      if (this.currentAnnouncement !== announcement || !announcement.active) return;
      this.tweens.add({
        targets: announcement,
        alpha: 0,
        y: announcement.y - 16,
        duration: 320,
        ease: "Sine.easeIn",
        onComplete: () => {
          if (this.currentAnnouncement === announcement) this.currentAnnouncement = undefined;
          announcement.destroy();
        }
      });
    });
  }

  private showOfficePopup(playerId: string, text: string, color: number): void {
    if (!this.active) return;
    const player = clientState.room?.players.find((candidate) => candidate.id === playerId);
    if (!player) return;
    const slot = OFFICE_SLOTS[player.officeSlot];
    if (!slot) return;
    const popupY = Math.max(46, slot.y - 150);
    const popup = this.add.text(Phaser.Math.Clamp(slot.x, 120, 1680), popupY, text, {
      fontFamily: "monospace",
      fontSize: "20px",
      color: Phaser.Display.Color.ValueToColor(color).rgba,
      backgroundColor: "#102634",
      padding: { x: 10, y: 6 },
      fontStyle: "bold"
    }).setOrigin(0.5).setDepth(80);
    this.tweens.add({
      targets: popup,
      y: popup.y - 24,
      alpha: 0,
      duration: 2400,
      ease: "Sine.easeOut",
      onComplete: () => popup.destroy()
    });
  }

  private followPath(target: Phaser.GameObjects.Sprite, path: Array<{ x: number; y: number }>, totalDuration: number, done: () => void): void {
    const segments = path.slice(1).map((point, index) => ({
      from: path[index]!,
      to: point,
      distance: Phaser.Math.Distance.Between(path[index]!.x, path[index]!.y, point.x, point.y)
    }));
    const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0) || 1;
    const run = (index: number) => {
      const segment = segments[index];
      if (!segment) return done();
      this.tweens.add({
        targets: target,
        x: segment.to.x,
        y: segment.to.y,
        duration: Math.max(80, totalDuration * (segment.distance / totalDistance)),
        ease: "Linear",
        onStart: () => target.setFlipX(segment.to.x < segment.from.x),
        onComplete: () => run(index + 1)
      });
    };
    run(0);
  }

  private drawAttackPathDebug(path: Array<{ x: number; y: number }>): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics().setDepth(1500);
    graphics.lineStyle(4, 0xfff44d, 0.78);
    graphics.beginPath();
    graphics.moveTo(path[0]!.x, path[0]!.y);
    for (const point of path.slice(1)) graphics.lineTo(point.x, point.y);
    graphics.strokePath();
    for (const point of path) {
      graphics.fillStyle(0x4dd7ff, 0.95);
      graphics.fillCircle(point.x, point.y, 4);
    }
    return graphics;
  }
}

function safeLabelOffset(slot: { x: number; y: number }): { x: number; y: number } {
  let x = 0;
  let y = -118;
  if (slot.y + y < 52) y = 108;
  if (slot.x < 300) x = 62;
  if (slot.x > 1500) x = -62;
  return { x, y };
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function announcementColor(type: AnnouncementType): string {
  if (type === "warning") return "#ffcf3d";
  if (type === "danger") return "#ff4d4d";
  if (type === "success") return "#5dff8a";
  return "#d8f4ff";
}

function dialogButtonStyle(primary: boolean): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "monospace",
    fontSize: "24px",
    color: primary ? "#071924" : "#ffffff",
    backgroundColor: primary ? "#f0c84d" : "#183544",
    padding: { x: 18, y: 10 },
    fontStyle: "bold"
  };
}
