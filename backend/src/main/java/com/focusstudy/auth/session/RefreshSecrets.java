package com.focusstudy.auth.session;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;

public final class RefreshSecrets {
    private static final SecureRandom RANDOM = new SecureRandom();
    private RefreshSecrets() { }
    public static String generate() {
        byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    public static String hash(String raw) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.US_ASCII))); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException("SHA-256 unavailable", ex); }
    }
    public static boolean valid(String raw) { return raw != null && raw.matches("[A-Za-z0-9_-]{43}"); }
}
