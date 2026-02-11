# Quick Start: Testing Payment Integration

## 🚀 5-Minute Test

### 1. Start Services (3 terminals)

**Terminal 1**: Payment Service
```bash
cd ~/Desktop/code/side-hustle/Scribe/payment-service
cargo run
```

**Terminal 2**: Auth Server  
```bash
cd ~/Desktop/code/side-hustle/Scribe/auth-server
cargo run
```

**Terminal 3**: Desktop App
```bash
cd ~/Desktop/code/side-hustle/Scribe
npm run dev
```

### 2. Test Payment Service

```bash
# In a 4th terminal
curl http://localhost:3002/health
# Expected: OK
```

### 3. Manual Checkout Test (Browser)

1. Go to your LemonSqueezy dashboard
2. Go to Products → Find your Basic or Pro product
3. Click "Share" → "Copy checkout URL"
4. Paste URL in browser
5. Use test card: `4242 4242 4242 4242` / `12/34` / `123`
6. Complete purchase
7. Check email for license key

### 4. Verify in Database

```bash
sudo -u postgres psql -d trueears_payments -c "SELECT COUNT(*) FROM orders;"
# Should show 1 (or more)
```

### 5. Check Webhook Logs

In Terminal 1 (payment service), you should see:
```
INFO Received webhook: order_created
INFO Webhook processed successfully
```

---

## ✅ If Everything Works

You're ready to integrate with the desktop app! See `TESTING_GUIDE.md` for:
- Adding License UI to Settings
- Testing activation in app
- End-to-end integration testing

---

## ⚠️ If Something Doesn't Work

### Service Won't Start?
- Check PostgreSQL: `sudo systemctl status postgresql`
- Check `.env` file exists and has correct values
- Check port 3002 is free: `lsof -i :3002`

### Webhook Not Received?
- Ensure webhook URL is correct in LemonSqueezy
- Check payment service is running
- Use ngrok for local testing: `ngrok http 3002`

### Checkout Fails?
- Verify variant IDs in `.env` are correct
- Check LemonSqueezy API key is valid
- Ensure test mode is enabled: `LEMONSQUEEZY_TEST_MODE=true`

---

## 📚 Full Guides

- `TESTING_GUIDE.md` - Complete step-by-step testing guide
- `LEMONSQUEEZY_SETUP.md` - Product setup instructions
- `RUN.md` - How to run the service
- `DEVELOPMENT.md` - Implementation roadmap

**Ready for full integration?** → See `TESTING_GUIDE.md`
