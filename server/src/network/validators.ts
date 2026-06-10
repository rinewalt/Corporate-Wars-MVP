import type { Gender } from "../types/shared.js";

export function isGender(value: unknown): value is Gender {
  return value === "male" || value === "female";
}

export function readName(value: unknown): string {
  if (typeof value !== "string") throw new Error("Name is required.");
  const name = value.trim();
  if (name.length < 1 || name.length > 16) throw new Error("Name must be 1-16 characters.");
  return name;
}

export function readRoomCode(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid room code");
  const code = value.trim().toUpperCase();
  if (!code) throw new Error("Invalid room code");
  return code;
}

export function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length < 1) throw new Error(`${label} is required.`);
  return value;
}
