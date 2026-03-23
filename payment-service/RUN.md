# 🚀 HOW TO RUN THE PAYMENT SERVICE

## ✅ Everything is Set Up!

- ✅ PostgreSQL 17 installed and running
- ✅ Database `trueears_payments` created
- ✅ All 4 migrations applied successfully
- ✅ Tables created: customers, subscriptions, orders, webhook_events
- ✅ Service compiles with 0 errors
- ✅ LemonSqueezy API key configured

## 🎯 Run the Service (3 Easy Steps)

### Step 1: Open Terminal in Project

```bash
cd ~/Desktop/code/side-hustle/Scribe/payment-service
```

### Step 2: Run the Service

```bash
cargo run
```

### Step 3: Test It (In Another Terminal)

```bash
curl http://localhost:3002/health
# Should return: OK
```

## 📺 What You'll See

When you run `cargo run`, you should see:

```
INFO payment_service: Loaded .env from: ".../payment-service/.env"
INFO payment_service: Starting payment service on 127.0.0.1:3002
INFO payment_service: Environment: development
INFO payment_service: LemonSqueezy test mode: true
INFO payment_service::db: Creating database connection pool
INFO payment_service::db: Database connection pool created successfully
INFO payment_service::db: Running database migrations
INFO payment_service::db: Database migrations completed successfully
INFO payment_service: Payment service listening on 127.0.0.1:3002
```

✅ If you see "Payment service listening on 127.0.0.1:3002" - **SUCCESS!**

## 🛠️ Current Endpoints

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /health` | ✅ WORKING | Health check - returns "OK" |
| All other endpoints | 🔄 Coming in Phase 2-9 | Will be implemented step-by-step |

## 🔍 Quick Checks

### Is PostgreSQL Running?

```bash
sudo systemctl status postgresql
```

Should show: `Active: active (exited)`

### Are Tables Created?

```bash
sudo -u postgres psql -d trueears_payments -c "\dt"
```

Should show 5 tables (including _sqlx_migrations).

### View Configuration

```bash
cd payment-service
cat .env | grep -v "API_KEY"  # Hide sensitive API key
```

## 🎓 What's Next?

The service is **running but incomplete**. Current status:

**Phase 1**: ✅ **COMPLETE** (Project scaffolding, database, basic server)

**Phase 2**: 🔄 **NEXT** (Webhook signature verification)
- Add webhook endpoint
- Implement HMAC-SHA256 verification
- Test with LemonSqueezy webhook events

**Phase 3-9**: ⬜ **TODO** (Checkout, subscriptions, management)

See `DEVELOPMENT.md` for the full TDD roadmap.

## 🐛 Troubleshooting

### Service Exits Immediately

Make sure you're in the right directory:
```bash
cd ~/Desktop/code/side-hustle/Scribe/payment-service
cargo run
```

### "Failed to connect to database"

Check PostgreSQL is running:
```bash
sudo systemctl restart postgresql
```

### Port 3002 Already in Use

Find and kill the process:
```bash
lsof -i :3002
kill -9 <PID>
```

## 💡 Pro Tips

### Run in Background

```bash
nohup cargo run > service.log 2>&1 &
echo $! > service.pid
```

Stop with:
```bash
kill $(cat service.pid)
```

### Watch Logs

```bash
tail -f service.log
```

### Run Tests

```bash
cargo test
# Currently: 8 tests passing (config, db, errors, models)
```

---

**Ready to continue development?** See `DEVELOPMENT.md` for Phase 2 implementation!
