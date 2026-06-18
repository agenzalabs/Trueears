# ── Build stage ──────────────────────────────────────────────────────────────
FROM rust:1.88-slim AS builder

# System deps for sqlx (native-tls) and linking
RUN apt-get update -o Acquire::Check-Valid-Until=false -o Acquire::Check-Date=false && \
    apt-get install -y pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache dependencies first
COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src && echo "fn main() {}" > src/main.rs
RUN cargo build --release --bin auth-server 2>/dev/null || true
RUN rm -rf src

# Build the real source
COPY . .
RUN cargo build --release --bin auth-server

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/auth-server ./auth-server
COPY --from=builder /app/migrations ./migrations

EXPOSE 3001

CMD ["./auth-server"]
