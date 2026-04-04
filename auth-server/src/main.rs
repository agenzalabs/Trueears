use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    auth_server::init_tracing();

    let (app, config) = auth_server::build_app_from_env()
        .await
        .expect("Failed to build auth server app");

    let addr: SocketAddr = format!("{}:{}", config.api_host, config.api_port)
        .parse()
        .expect("Invalid address");

    tracing::info!("Auth server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind listener");

    axum::serve(listener, app)
        .await
        .expect("Auth server exited unexpectedly");
}
