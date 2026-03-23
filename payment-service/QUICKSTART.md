# Payment Service Quick Start Guide

## ✅ Prerequisites Installed

You have successfully set up:
- ✅ Rust 1.92.0
- ✅ PostgreSQL 17
- ✅ Database `trueears_payments` created
- ✅ All migrations applied (4 tables created)

## 🚀 Running the Service

### Option 1: Simple Run (Recommended for Development)

```bash
cd payment-service
cargo run
```

The service will:
1. Load environment variables from `.env`
2. Connect to PostgreSQL
3. Run any pending migrations
4. Start the HTTP server on `http://localhost:3002`

You should see output like:
```
INFO payment_service: Starting payment service on 127.0.0.1:3002
INFO payment_service: Environment: development
INFO payment_service: LemonSqueezy test mode: true
INFO payment_service::db: Database migrations completed successfully
INFO payment_service: Payment service listening on 127.0.0.1:3002
```

### Option 2: Using the Run Script

```bash
cd payment-service
./run.sh
```

### Option 3: Background Process (Production-like)

```bash
cd payment-service
nohup cargo run > payment-service.log 2>&1 &
echo $! > payment-service.pid
```

To stop:
```bash
kill $(cat payment-service.pid)
```

## 🧪 Testing the Service

### Health Check

```bash
curl http://localhost:3002/health
# Expected: OK
```

### Check Logs

```bash
# If running in background
tail -f payment-service/payment-service.log

# If using systemd (production)
journalctl -u payment-service -f
```

## 📊 Database Verification

### Check Tables

```bash
sudo -u postgres psql -d trueears_payments -c "\dt"
```

Expected output:
```
              List of relations
 Schema |       Name       | Type  |  Owner
--------+------------------+-------+----------
 public | customers        | table | postgres
 public | orders           | table | postgres
 public | subscriptions    | table | postgres
 public | webhook_events   | table | postgres
```

### View Table Schema

```bash
sudo -u postgres psql -d trueears_payments -c "\d+ subscriptions"
```

### Query Data (Should be empty initially)

```bash
sudo -u postgres psql -d trueears_payments -c "SELECT COUNT(*) FROM customers;"
sudo -u postgres psql -d trueears_payments -c "SELECT COUNT(*) FROM subscriptions;"
sudo -u postgres psql -d trueears_payments -c "SELECT COUNT(*) FROM webhook_events;"
```

## 🔧 Configuration

Your current `.env` configuration:

```env
# Server
PAYMENT_API_HOST=127.0.0.1
PAYMENT_API_PORT=3002

# Database (✅ Configured)
PAYMENT_DATABASE_URL=postgres://postgres:trueears_dev_pass@localhost:5432/trueears_payments

# LemonSqueezy (✅ API Key configured)
LEMONSQUEEZY_API_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...
LEMONSQUEEZY_STORE_ID=290936
LEMONSQUEEZY_WEBHOOK_SECRET=12345678  # ⚠️ Update with real secret from webhook config

# Product Variants (⚠️ Update when you create products)
LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY=12345
LEMONSQUEEZY_VARIANT_ID_BASIC_ANNUAL=12346
LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY=12347
LEMONSQUEEZY_VARIANT_ID_PRO_ANNUAL=12348

# JWT (⚠️ Must match auth-server secret)
JWT_SECRET=same_secret_as_auth_server

# Environment
IS_PRODUCTION=false
LEMONSQUEEZY_TEST_MODE=true
```

### What to Update

1. **LEMONSQUEEZY_WEBHOOK_SECRET**: Replace `12345678` with the actual signing secret from your LemonSqueezy webhook configuration
2. **LEMONSQUEEZY_VARIANT_ID_***: Update with real variant IDs after creating products in LemonSqueezy
3. **JWT_SECRET**: Must match the secret used in your auth-server (check `auth-server/.env`)

## 🌐 Setting Up Public Access (For Webhooks)

LemonSqueezy webhooks require a **public HTTPS URL**. Here are your options:

### Option 1: ngrok (Local Development)

```bash
# Install ngrok
brew install ngrok  # macOS
# or
snap install ngrok  # Linux

# Start ngrok tunnel
ngrok http 3002

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update LemonSqueezy webhook URL to: https://abc123.ngrok.io/webhooks/lemonsqueezy
```

### Option 2: Deploy to Production

Update your LemonSqueezy webhook configuration:
```
Callback URL: https://trueearsal.com/webhooks/lemonsqueezy
```

Make sure:
- ✅ Domain points to your server
- ✅ HTTPS/SSL certificate is configured
- ✅ Port 3002 is accessible (or reverse proxy configured)
- ✅ Firewall allows incoming traffic

## 📋 API Endpoints Reference

| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `/health` | GET | No | ✅ Working |
| `/webhooks/lemonsqueezy` | POST | HMAC | 🔄 Phase 2 |
| `/api/checkout` | POST | JWT | 🔄 Phase 5 |
| `/api/subscriptions/me` | GET | JWT | 🔄 Phase 7 |
| `/api/subscriptions/me/cancel` | POST | JWT | 🔄 Phase 8 |
| `/api/subscriptions/me/pause` | POST | JWT | 🔄 Phase 8 |
| `/api/subscriptions/me/resume` | POST | JWT | 🔄 Phase 8 |
| `/api/subscriptions/me/portal` | GET | JWT | 🔄 Phase 6 |

Legend: ✅ Implemented | 🔄 In Development | ⬜ Not Started

## 🐛 Troubleshooting

### Service Won't Start

**Error: Failed to create database pool**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql
```

**Error: Migration failed**
```bash
# Reset migrations (⚠️ DESTROYS DATA)
sudo -u postgres psql -c "DROP DATABASE trueears_payments;"
sudo -u postgres psql -c "CREATE DATABASE trueears_payments;"
cd payment-service
DATABASE_URL="postgres://postgres:trueears_dev_pass@localhost:5432/trueears_payments" sqlx migrate run
```

### Port Already in Use

```bash
# Find process using port 3002
lsof -i :3002

# Kill the process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Test connection manually
PGPASSWORD=trueears_dev_pass psql -h localhost -U postgres -d trueears_payments

# If "Peer authentication failed":
sudo -u postgres psql -d trueears_payments
```

### LemonSqueezy Webhook Issues

**Webhook signature verification fails**
- ✅ Ensure `LEMONSQUEEZY_WEBHOOK_SECRET` matches the secret from LemonSqueezy dashboard
- ✅ Check webhook payload in LemonSqueezy dashboard logs
- ✅ Verify service is accessible at the callback URL

**Webhook not received**
- ✅ Check service is running: `curl http://localhost:3002/health`
- ✅ Verify ngrok tunnel is active (if using)
- ✅ Check LemonSqueezy webhook delivery logs
- ✅ Ensure firewall allows incoming connections

## 📚 Next Steps

### Phase 2: Implement Webhook Verification (Next)

See `DEVELOPMENT.md` for TDD roadmap.

```bash
# Create webhook verification tests
cd payment-service
cargo test

# Start implementing Phase 2
# See DEVELOPMENT.md for step-by-step guide
```

### Set Up LemonSqueezy Products

1. Log in to [LemonSqueezy Dashboard](https://app.lemonsqueezy.com/)
2. Create products (e.g., "Trueears Basic", "Trueears Pro")
3. Add variants for each pricing tier (monthly/annual)
4. Copy variant IDs and update `.env`
5. Configure webhook (if not done already)

### Test End-to-End Flow

Once Phase 2-6 are complete:
1. Create a test checkout from the desktop app
2. Complete payment in LemonSqueezy test mode
3. Verify webhook is received and subscription is created
4. Query subscription status from desktop app

## 🆘 Need Help?

- **Service Issues**: Check `DEVELOPMENT.md` and `README.md`
- **LemonSqueezy API**: See [docs.lemonsqueezy.com](https://docs.lemonsqueezy.com/)
- **Database Issues**: Check PostgreSQL logs: `sudo journalctl -u postgresql`
- **Implementation Guide**: See `DEVELOPMENT.md` for TDD roadmap

---

**Current Status**: ✅ Phase 1 Complete - Service is running and ready for Phase 2 (Webhook Verification)