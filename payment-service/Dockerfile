# syntax=docker/dockerfile:1

# ---- Builder ----
# sqlx + reqwest use native-tls; keep it (rustls risks breaking Neon's
# channel_binding=require SCRAM support), so the builder needs OpenSSL dev libs.
FROM rust:1.83-slim-bookworm AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests first for better layer caching, then sources.
COPY Cargo.toml Cargo.lock ./
COPY migrations ./migrations
COPY src ./src

# Migrations are embedded into the binary at compile time via
# sqlx::migrate!("./migrations"), so the runtime image needs no migration files.
RUN cargo build --release --bin payment-service

# ---- Runtime ----
FROM debian:bookworm-slim AS runtime

# ca-certificates for TLS to Neon + LemonSqueezy; libssl3 for native-tls.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/payment-service /usr/local/bin/payment-service

# Bind to all interfaces inside the container; the platform maps $PORT.
ENV PAYMENT_API_HOST=0.0.0.0

EXPOSE 3002

CMD ["payment-service"]
