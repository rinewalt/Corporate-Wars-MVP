export interface StoredSession {
  roomId: string;
  playerId: string;
  reconnectToken: string;
}

const key = "corporate-wars-session";

export function saveSession(session: StoredSession): void {
  localStorage.setItem(key, JSON.stringify(session));
}

export function loadSession(): StoredSession | undefined {
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed.roomId && parsed.playerId && parsed.reconnectToken) return parsed;
  } catch {
    clearSession();
  }
  return undefined;
}

export function clearSession(): void {
  localStorage.removeItem(key);
}
