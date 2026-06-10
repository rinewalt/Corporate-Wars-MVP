export class SocketRateLimit {
    seen = new Map();
    allow(socketId, event, limit, windowMs, now = Date.now()) {
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
    clearSocket(socketId) {
        for (const key of this.seen.keys()) {
            if (key.startsWith(`${socketId}:`))
                this.seen.delete(key);
        }
    }
}
