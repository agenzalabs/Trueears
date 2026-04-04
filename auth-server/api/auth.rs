use std::io;
use tower::ServiceBuilder;
use vercel_runtime::axum::VercelLayer;
use vercel_runtime::Error;

#[tokio::main]
async fn main() -> Result<(), Error> {
    auth_server::init_tracing();

    let (app, _config) = auth_server::build_app_from_env()
        .await
        .map_err(io::Error::other)?;

    let app = ServiceBuilder::new().layer(VercelLayer::new()).service(app);

    vercel_runtime::run(app).await
}
