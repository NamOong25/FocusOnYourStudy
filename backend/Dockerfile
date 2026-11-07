# syntax=docker/dockerfile:1
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /build
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
COPY src/main/ src/main/
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw
# Run the database-backed test suite separately before release.
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -ntp -Dmaven.test.skip=true package

FROM eclipse-temurin:21-jre-jammy AS runtime
# Render mounts runtime secret files with group 1000 access.
RUN groupadd --system --gid 10001 focus \
    && (getent group 1000 >/dev/null || groupadd --gid 1000 render-secrets) \
    && useradd --system --uid 10001 --gid focus --groups 1000 --home-dir /app --shell /usr/sbin/nologin focus
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/target/focus-study-backend-0.0.1-SNAPSHOT.jar /app/app.jar
ENV SPRING_PROFILES_ACTIVE=prod
USER focus
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70.0", "-jar", "/app/app.jar"]
