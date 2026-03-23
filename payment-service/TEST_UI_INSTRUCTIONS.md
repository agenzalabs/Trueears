# 🎨 Payment Test UI - Instructions

## Quick Start

### Step 1: Open the Test UI

```bash
cd ~/Desktop/code/side-hustle/Scribe/payment-service

# Open in your default browser
xdg-open test-ui.html

# Or manually: Right-click test-ui.html → Open With → Browser
```

### Step 2: Make Sure Payment Service is Running

```bash
# In another terminal
cd ~/Desktop/code/side-hustle/Scribe/payment-service
cargo run
```

The UI will show "Service Status: ✓ Online" when connected.

### Step 3: Enter Your Variant IDs

1. In the LemonSqueezy dashboard, find your products
2. Copy the **Variant ID** for Basic License
3. Copy the **Variant ID** for Pro License
4. Paste them in the Configuration section of the test UI

**The UI will save these automatically** (uses localStorage).

### Step 4: Test a Purchase!

1. Click **"Purchase Basic"** or **"Purchase Pro"**
2. A new browser tab will open with LemonSqueezy checkout
3. Use test card: `4242 4242 4242 4242` / `12/34` / `123`
4. Complete the purchase
5. Check your email for the license key
6. Check the Activity Log in the UI for status updates

### Step 5: Watch for Webhooks

In the terminal where payment service is running, you should see:
```
INFO Received webhook: order_created
INFO Order created for customer: your@email.com
```

### Step 6: Verify in Database

```bash
sudo -u postgres psql -d trueears_payments -c "SELECT license_key, total FROM orders ORDER BY created_at DESC LIMIT 1;"
```

---

## Features

### Configuration Section
- **Service URL**: Payment service endpoint (default: http://localhost:3002)
- **Service Status**: Real-time health check (updates every 10s)
- **Variant IDs**: Your LemonSqueezy product variant IDs

### Product Cards
- **Basic License**: $49 one-time payment
- **Pro License**: $99 one-time payment (featured)
- Click card or button to purchase

### License Activation
- Enter license key (from email after purchase)
- Click "Activate" to activate on this device
- **Note**: Activation API not yet implemented (Phase 7-8)

### Activity Log
- Real-time logging of all actions
- Color-coded: Info (blue), Success (green), Error (red)
- Auto-scrolls to latest entry

---

## What Gets Tested

✅ **Payment Service Health** - Checks if service is online
✅ **Checkout Creation** - Creates LemonSqueezy checkout URL
✅ **Browser Redirect** - Opens checkout in new window
✅ **Test Mode Purchase** - Complete with test card
✅ **License Delivery** - Receive key via email
✅ **Activity Logging** - Track all actions in UI

⚠️ **Not Yet Implemented**:
- License activation API (Phase 7-8)
- JWT authentication (currently no auth required)
- License status checking (Phase 7)

---

## Troubleshooting

### "Service Status: ✗ Offline"

**Fix**: Start the payment service
```bash
cd payment-service
cargo run
```

### "Please enter the Variant ID"

**Fix**: 
1. Go to LemonSqueezy Dashboard → Products
2. Click your product → Copy the Variant ID
3. Paste in Configuration section

### "Failed to create checkout: HTTP 400"

**Fix**: Check that:
- Variant IDs are correct
- Payment service `.env` has LemonSqueezy API key
- Service is running

### Checkout Opens But Payment Fails

**Fix**: Make sure you're using test card:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)

---

## Advanced: Testing with JWT Auth

The payment service expects JWT tokens for real use. To test with auth:

1. Get a JWT token from your auth-server
2. Open browser DevTools (F12)
3. In Console, run:
```javascript
// Save token
localStorage.setItem('auth_token', 'YOUR_JWT_TOKEN_HERE');

// Modify fetch calls in test-ui.html to include:
headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
}
```

---

## Screenshots

### Main Interface
- Configuration section with service status
- Product cards (Basic + Pro)
- License activation input
- Activity log

### Workflow
1. Open UI → Check status (green = online)
2. Enter variant IDs
3. Click "Purchase"
4. Complete checkout in new window
5. Receive license key in email
6. Enter key in activation section

---

## Tips

💡 **Save Time**: Variant IDs are saved automatically in browser
💡 **Watch Logs**: Activity log shows all API calls and responses
💡 **Health Check**: Status updates every 10 seconds automatically
💡 **Test Mode**: Always use test card for testing!

---

## What's Next?

After successful purchase test:

1. ✅ Verify webhook received (check payment service logs)
2. ✅ Verify order in database
3. ✅ Verify license key in email
4. 🔄 Implement Phase 2-8 (webhook handlers, activation API)
5. 🔄 Add JWT authentication
6. 🔄 Build full desktop integration (on Windows)

---

## Files

- `test-ui.html` - Standalone HTML test page
- `TEST_UI_INSTRUCTIONS.md` - This file
- `TEST_STATUS.md` - Overall testing status

**Ready to test!** 🚀 Open `test-ui.html` in your browser and start testing!
