package com.focusstudy;

import java.nio.file.*;
import java.security.KeyPairGenerator;
import java.util.Base64;
import org.springframework.test.context.DynamicPropertyRegistry;

final class TestJwtResources {
    private static final Path DIRECTORY = create();
    private static Path create() {
        try {
            Files.createDirectories(Path.of("target"));
            Path directory = Files.createTempDirectory(Path.of("target"), "test-jwt-");
            var generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048);
            var keys = generator.generateKeyPair();
            Files.writeString(directory.resolve("private.pem"), pem("PRIVATE KEY", keys.getPrivate().getEncoded()));
            Files.writeString(directory.resolve("public.pem"), pem("PUBLIC KEY", keys.getPublic().getEncoded()));
            return directory.toAbsolutePath();
        } catch (Exception ex) { throw new IllegalStateException("Cannot create isolated test JWT keys", ex); }
    }
    private static String pem(String type, byte[] bytes) {
        return "-----BEGIN " + type + "-----\n" + Base64.getEncoder().encodeToString(bytes) + "\n-----END " + type + "-----\n";
    }
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("app.auth.jwt.private-key-location", () -> DIRECTORY.resolve("private.pem").toUri().toString());
        registry.add("app.auth.jwt.public-key-location", () -> DIRECTORY.resolve("public.pem").toUri().toString());
        registry.add("app.auth.jwt.issuer", () -> "urn:focus-study:test");
    }
}
