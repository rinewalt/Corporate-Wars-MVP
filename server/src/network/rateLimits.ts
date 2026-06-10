export class SocketRateLimit {
  private seen = new Map<string, number[]>();

  allow(socketId: string, event: string, limit: number, windowMs: number, now = Date.now()): boolean {
    const key = `${socketId}:${event}`;
    const history = (this.seen.get(key) ?? []).filter((time) => now - time <= windowMs);
    if (history.length >= limit) {
      this.seen.set(key, history);
      return false;
    }
    history.push(now);
    this.seen.set(key, history);
    return true;
  }

  clearSocket(socketId: string): void {
    for (const key of this.seen.keys()) {
      if (key.startsWith(`${socketId}:`)) this.seen.delete(key);
    }
  }
}
