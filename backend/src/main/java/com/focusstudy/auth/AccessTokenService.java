package com.focusstudy.auth;

import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

@Service
public class AccessTokenService {
    private final JwtEncoder encoder;
    private final JwtProperties properties;
    private final Clock clock;
    public AccessTokenService(JwtEncoder encoder, JwtProperties properties, Clock clock) {
        this.encoder = encoder; this.properties = properties; this.clock = clock;
    }
    public String issue(UUID userId) {
        var now = clock.instant();
        var claims = JwtClaimsSet.builder().issuer(properties.issuer()).audience(List.of(properties.audience()))
                .subject(userId.toString()).id(UUID.randomUUID().toString()).issuedAt(now).notBefore(now)
                .expiresAt(now.plus(properties.accessTokenTtl())).claim("token_use", "access").build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), claims)).getTokenValue();
    }
    public long expiresIn() { return properties.accessTokenTtl().toSeconds(); }
}
