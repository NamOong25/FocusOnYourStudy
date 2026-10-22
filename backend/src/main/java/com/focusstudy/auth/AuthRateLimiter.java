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
    private final int loginLimit, registerLimit, refreshLimit, logoutLimit, maxKeys;
    public AuthRateLimiter(Clock clock, int loginLimit, int registerLimit, int maxKeys) {
        this(clock, loginLimit, registerLimit, 60, 60, maxKeys);
    }
    public AuthRateLimiter(Clock clock, int loginLimit, int registerLimit, int refreshLimit, int logoutLimit, int maxKeys) {
        if (loginLimit < 1 || registerLimit < 1 || refreshLimit < 1 || logoutLimit < 1 || maxKeys < 1)
            throw new IllegalArgumentException("Auth limits must be positive");
        this.clock = clock; this.loginLimit = loginLimit; this.registerLimit = registerLimit;
        this.refreshLimit = refreshLimit; this.logoutLimit = logoutLimit; this.maxKeys = maxKeys;
    }
    public Permit acquire(boolean register, String client) { return acquire(register ? "register" : "login", client); }
    public synchronized Permit acquire(String route, String client) {
        int limit = switch (route) {
            case "register" -> registerLimit;
            case "login" -> loginLimit;
            case "refresh" -> refreshLimit;
            case "logout" -> logoutLimit;
            default -> throw new IllegalArgumentException("Unknown auth route");
        };
        long now = clock.millis();
        String key = route + ":" + client;
        var old = windows.get(key);
        if (old != null && now - old.since() >= 60_000) { windows.remove(key); old = null; }
        if (old == null) {
            if (windows.size() >= maxKeys) windows.values().removeIf(window -> now - window.since() >= 60_000);
            if (windows.size() >= maxKeys) return new Permit(false, 60);
            windows.put(key, new Window(now, 1)); return new Permit(true, 0);
        }
        if (old.requests() >= limit)
            return new Permit(false, Math.max(1, (60_000 - (now - old.since()) + 999) / 1000));
        windows.put(key, new Window(old.since(), old.requests() + 1));
        return new Permit(true, 0);
    }
}
