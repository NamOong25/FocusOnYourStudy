package com.focusstudy.auth;

import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.*;
import java.time.*;
import java.util.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.core.io.Resource;
import org.springframework.security.crypto.password.*;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;

@Configuration @EnableConfigurationProperties(JwtProperties.class)
public class AuthConfig {
    @Bean Clock authClock() { return Clock.systemUTC(); }

    @Bean PasswordEncoder passwordEncoder() {
        var pbkdf2 = new Pbkdf2PasswordEncoder("", 16, 600_000, 256);
        pbkdf2.setAlgorithm(Pbkdf2PasswordEncoder.SecretKeyFactoryAlgorithm.PBKDF2WithHmacSHA256);
        return new DelegatingPasswordEncoder("pbkdf2-sha256-v1", Map.of("pbkdf2-sha256-v1", pbkdf2));
    }

    @Bean KeyPair signingKeys(JwtProperties properties) throws Exception {
        KeyFactory factory = KeyFactory.getInstance("RSA");
        var privateKey = (RSAPrivateKey) factory.generatePrivate(new PKCS8EncodedKeySpec(readPem(properties.privateKeyLocation(), "PRIVATE KEY")));
        var publicKey = (RSAPublicKey) factory.generatePublic(new X509EncodedKeySpec(readPem(properties.publicKeyLocation(), "PUBLIC KEY")));
        if (privateKey.getModulus().bitLength() < 2048 || !privateKey.getModulus().equals(publicKey.getModulus()))
            throw new IllegalArgumentException("JWT requires a matching RSA key pair of at least 2048 bits");
        var proof = Signature.getInstance("SHA256withRSA");
        proof.initSign(privateKey); proof.update("focus-study-key-check".getBytes(StandardCharsets.UTF_8));
        byte[] signature = proof.sign();
        proof.initVerify(publicKey); proof.update("focus-study-key-check".getBytes(StandardCharsets.UTF_8));
        if (!proof.verify(signature)) throw new IllegalArgumentException("JWT keys do not form a pair");
        return new KeyPair(publicKey, privateKey);
    }

    private byte[] readPem(Resource resource, String label) throws Exception {
        try (var stream = resource.getInputStream()) {
            String text = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            return Base64.getDecoder().decode(text.replace("-----BEGIN " + label + "-----", "")
                    .replace("-----END " + label + "-----", "").replaceAll("\\s", ""));
        }
    }

    @Bean JwtEncoder jwtEncoder(KeyPair keys) {
        var key = new RSAKey.Builder((RSAPublicKey) keys.getPublic()).privateKey(keys.getPrivate()).keyID("access-v1").build();
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(key)));
    }

    @Bean JwtDecoder jwtDecoder(KeyPair keys, JwtProperties properties) {
        var decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) keys.getPublic()).signatureAlgorithm(SignatureAlgorithm.RS256).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(Duration.ofSeconds(30)), new JwtIssuerValidator(properties.issuer()),
                new JwtClaimValidator<List<String>>("aud", audience -> audience != null && audience.contains(properties.audience())),
                new JwtClaimValidator<String>("token_use", "access"::equals),
                new JwtClaimValidator<Instant>("exp", Objects::nonNull),
                new JwtClaimValidator<String>("sub", AuthConfig::validUserId)));
        return decoder;
    }

    private static boolean validUserId(String id) {
        if (id == null || !id.matches("[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}")) return false;
        try { UUID.fromString(id); return true; } catch (IllegalArgumentException ex) { return false; }
    }
}
