import { randomBytes, randomUUID } from "node:crypto";
import { GAME } from "../config/constants.js";
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function id(prefix) {
    return `${prefix}_${randomUUID()}`;
}
export function token() {
    return randomBytes(24).toString("base64url");
}
export function roomCode(existing) {
    for (let attempt = 0; attempt < 1000; attempt += 1) {
        let code = "";
        for (let i = 0; i < GAME.roomCodeLength; i += 1) {
            code += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        if (!existing.has(code))
            return code;
    }
    throw new Error("Unable to allocate a room code.");
}
