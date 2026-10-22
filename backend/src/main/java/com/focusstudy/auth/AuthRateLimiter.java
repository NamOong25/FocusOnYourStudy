package com.focusstudy.auth;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;

// Per-instance fixed window with a bounded number of keys; never uses X-Forwarded-For.
public class AuthRateLimiter {
    public record Permit(boolean allowed, long retryAfterSeconds) { }
    private record Window(long since, int requests) { }
    private final Map<String, Window> windows = new HashMap<>();
    private final Clock clock;
    private final int loginLimit, registerLimit, maxKeys;
    public AuthRateLimiter(Clock clock, int loginLimit, int registerLimit, int maxKeys) {
        if (loginLimit < 1 || registerLimit < 1 || maxKeys < 1) throw new IllegalArgumentException("Auth limits must be positive");
        this.clock = clock; this.loginLimit = loginLimit; this.registerLimit = registerLimit; this.maxKeys = maxKeys;
    }
    public synchronized Permit acquire(boolean register, String client) {
        long now = clock.millis();
        String key = (register ? "register:" : "login:") + client;
        var old = windows.get(key);
        if (old != null && now - old.since() >= 60_000) { windows.remove(key); old = null; }
        if (old == null) {
            if (windows.size() >= maxKeys) windows.values().removeIf(window -> now - window.since() >= 60_000);
            if (windows.size() >= maxKeys) return new Permit(false, 60);
            windows.put(key, new Window(now, 1)); return new Permit(true, 0);
        }
        if (old.requests() >= (register ? registerLimit : loginLimit))
            return new Permit(false, Math.max(1, (60_000 - (now - old.since()) + 999) / 1000));
        windows.put(key, new Window(old.since(), old.requests() + 1));
        return new Permit(true, 0);
    }
}
