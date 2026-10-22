package com.focusstudy.common.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@MappedSuperclass
public abstract class BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    protected UUID id;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    protected Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    protected Instant updatedAt;
    @Version @Column(nullable = false)
    protected long version;

    public UUID getId() { return id; }
}
