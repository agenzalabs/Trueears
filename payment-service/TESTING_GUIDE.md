# Payment Service Testing Guide

Complete guide to testing the LemonSqueezy payment integration with your Trueears desktop app.

## 🎯 Overview

This guide covers:
1. Setting up the payment service
2. Testing the payment service API
3. Integrating with the desktop app
4. Testing the complete checkout flow
5. Testing license activation
# Server Configuration
PAYMENT_API_HOST=127.0.0.1
PAYMENT_API_PORT=3002

# Database
PAYMENT_DATABASE_URL=postgres://postgres:trueears_dev_pass@localhost:5432/trueears_payments

# LemonSqueezy API
LEMONSQUEEZY_API_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiIwMTcxNzc1ZmI2MGM3ODg4YjA3MDJhMmVhODIyNzg1MzE3NzA3MmQ0MmY3YmI0MDMzODJkMGQ0YzQ3OTc1MmZlZGViZjg4NzhkNzk2ODNlZSIsImlhdCI6MTc3MDgzNzY4NC4xOTI2NzksIm5iZiI6MTc3MDgzNzY4NC4xOTI2ODEsImV4cCI6MTgyNjQ5NjAwMC4wMjc3MjQsInN1YiI6IjY1MDE3ODgiLCJzY29wZXMiOltdfQ.PjcbUTJ_zIswnX0NFVpggwFfFPjqgqmzkmy0XtBakFkA8GukBALx3Xim4zOOO1AR1B5cR5BtzMsKUT8wdvUd3c32_s7WCRDP2mep8CsjDo9r9ptxe6UUVaE4eHLdTaU5B5XxWgosyzQAAEOQiM0aQQQ2jObeRws1ITCLdW_-Oz8AVveTj6Gn4osZPrGA-SSv_Xvu4By2UoIn_ZNGQXPagSHmni5TQiDgKxIQ3LLQ_9dtY__ucmoi1pJbRRQJE8up6E5Ik8ZY12T2WHbHs8gtxY1_V5FmpwQGWHFfVirFPyQrVkS_kved4EwAaDWVqPi2y3D454MX3gLfoO9aHVrYL3J4hxKbRMLJ1z38d2vJIcJOHbotNRgeLC9SvUXQNMlJLuH0hAQGGW28SduOmR7l1090FsYW_UOoa_Pf3vQIlR8XNJZ7DSMqkU3mtu3NKGZfqWtBi9zoXfuQSKYWOCN8FFb6k3Z2lhNYDQbLW7QEh_M7fqe5x0e-sVnFbmnmcxogOC2HFu_sZaMV44K1JNVjMvTuPVOZ0sw1A1WvMzSqRzE8hoDjdr-gWJcDg1C9rXhgaH9anJZ5cQW7zTpAK9JSVzIaUnoe242dbJ9RlYjkc6s55-ubFN5lyTfUX_Lz3_qyDzIN8j2yfP1Itg-3xfAGXRkl3zHQbunmxxeo-CEy5Is
LEMONSQUEEZY_STORE_ID=290936
LEMONSQUEEZY_WEBHOOK_SECRET=12345678
LEMONSQUEEZY_VARIANT_ID_PRO=1299558
# Product Variants (LemonSqueezy variant IDs for each plan)
LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY=12345
LEMONSQUEEZY_VARIANT_ID_BASIC_ANNUAL=12346
LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY=12347
LEMONSQUEEZY_VARIANT_ID_PRO_ANNUAL=12348

# JWT (shared with auth-server for token validation)
JWT_SECRET=same_secret_as_auth_server

# Environment
IS_PRODUCTION=false
LEMONSQUEEZY_TEST_MODE=true
https://darcie-supercretaceous-enquiringly.ngrok-free.app/webhooks/lemonsqueezy
---

## ✅ Prerequisites

Before testing, make sure you have:

- [x] Payment service running (`cargo run` in `payment-service/`)
- [x] PostgreSQL running with `trueears_payments` database
- [x] LemonSqueezy products created (Basic + Pro)
- [x] Variant IDs copied to `.env`
- [x] Webhook configured in LemonSqueezy
- [x] Auth server running (for JWT tokens)
- [x] Desktop app running (`npm run dev` in root)

---

## 🚀 Step 1: Start All Services

### Terminal 1: Start Payment Service

```bash
cd ~/Desktop/code/side-hustle/Scribe/payment-service
cargo run
```

Wait for:
```
✅ INFO payment_service: Payment service listening on 127.0.0.1:3002
```

### Terminal 2: Start Auth Server (if not running)

```bash
cd ~/Desktop/code/side-hustle/Scribe/auth-server
cargo run
```

### Terminal 3: Start Desktop App

```bash
cd ~/Desktop/code/side-hustle/Scribe
npm run dev
```

---

## 🧪 Step 2: Test Payment Service API

### Test 1: Health Check

```bash
curl http://localhost:3002/health
```

**Expected**: `OK`

### Test 2: Check Database Tables

```bash
sudo -u postgres psql -d trueears_payments -c "SELECT COUNT(*) FROM orders;"
sudo -u postgres psql -d trueears_payments -c "SELECT COUNT(*) FROM customers;"
```

**Expected**: `0` (empty tables initially)

---

## 🔗 Step 3: Connect Desktop App to Payment Service

### Option A: Add Environment Variable

Create `frontend/.env.local`:

```env
VITE_PAYMENT_SERVICE_URL=http://localhost:3002
```

### Option B: Configure in Settings (Future)

Once implemented, you'll configure the payment service URL in the app settings.

---

## 💳 Step 4: Test Checkout Flow (Manual API Test)

Before integrating with the app, test the API directly:

### Get a JWT Token from Auth Server

```bash
# You need a valid JWT token from your auth server
# For testing, you can use an existing token from localStorage in the app

# Or create a test user and get their token
# (This depends on your auth-server setup)
```

### Create a Checkout Session

```bash
# Replace YOUR_JWT_TOKEN with actual token
# Replace VARIANT_ID with your Basic or Pro variant ID from .env

curl -X POST http://localhost:3002/api/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"variant_id": "YOUR_BASIC_VARIANT_ID"}'
```

**Expected Response**:
```json
{
  "checkout_url": "https://yourstore.lemonsqueezy.com/checkout/buy/..."
}
```

**If it works**: You'll get a checkout URL! 🎉

---

## 🖥️ Step 5: Add Pricing UI to Desktop App

### Create a Pricing/License Settings Tab

Add a new tab in `SettingsWindow.tsx`:

```typescript
// Add to SettingsTab type
type SettingsTab = 'transcription' | 'llm' | 'profiles' | 'logmode' | 'preferences' | 'account' | 'license' | 'legal' | 'about';
```

### Create License Settings Component

**File**: `frontend/src/components/settings/LicenseSettings.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { paymentService, LicenseStatus } from '../../services/paymentService';
import { open } from '@tauri-apps/plugin-shell';

interface LicenseSettingsProps {
  theme: 'light' | 'dark';
}

export const LicenseSettings: React.FC<LicenseSettingsProps> = ({ theme }) => {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');

  const isDark = theme === 'dark';

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    setLoading(true);
    try {
      const status = await paymentService.checkLicenseStatus();
      setLicenseStatus(status);
    } catch (error) {
      console.error('Failed to check license:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (tier: 'basic' | 'pro') => {
    try {
      // Get variant ID from environment or config
      const variantId = tier === 'basic' 
        ? import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID_BASIC
        : import.meta.env.VITE_LEMONSQUEEZY_VARIANT_ID_PRO;

      const checkoutUrl = await paymentService.createCheckout(variantId);
      
      // Open checkout in browser
      await open(checkoutUrl);
      
      alert('Complete your purchase in the browser. Your license key will be emailed to you.');
    } catch (error) {
      alert(`Failed to create checkout: ${error}`);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      alert('Please enter a license key');
      return;
    }

    setActivating(true);
    try {
      const result = await paymentService.activateLicense(licenseKey);
      alert(`License activated! (${result.activations_used}/${result.activations_limit} activations used)`);
      await checkLicense();
      setLicenseKey('');
    } catch (error) {
      alert(`Failed to activate license: ${error}`);
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading license status...</div>;
  }

  return (
    <div className={`p-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <h2 className="text-xl font-bold mb-4">License & Subscription</h2>

      {/* Current License Status */}
      <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <h3 className="font-semibold mb-2">Current License</h3>
        {licenseStatus?.valid ? (
          <div>
            <p className="text-green-500 font-semibold">✓ Active</p>
            <p className="text-sm mt-2">Product: {licenseStatus.product_name}</p>
            <p className="text-sm">Tier: {licenseStatus.variant_name}</p>
            <p className="text-sm">
              Activations: {licenseStatus.activations_used}/{licenseStatus.activations_limit}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-yellow-500">Free Tier</p>
            <p className="text-sm mt-2">Upgrade to unlock premium features</p>
          </div>
        )}
      </div>

      {/* Pricing Plans */}
      {!licenseStatus?.valid && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Basic License */}
          <div className={`p-4 rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
            <h3 className="font-semibold text-lg mb-2">Basic License</h3>
            <p className="text-2xl font-bold mb-2">$49</p>
            <p className="text-sm mb-4">One-time payment</p>
            <ul className="text-sm space-y-1 mb-4">
              <li>✓ Unlimited transcriptions</li>
              <li>✓ Context-aware formatting</li>
              <li>✓ App profiles</li>
              <li>✓ 1 year updates</li>
              <li>✓ 3 device activations</li>
            </ul>
            <button
              onClick={() => handlePurchase('basic')}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Purchase Basic
            </button>
          </div>

          {/* Pro License */}
          <div className={`p-4 rounded-lg border-2 ${isDark ? 'border-purple-500' : 'border-purple-600'}`}>
            <h3 className="font-semibold text-lg mb-2">Pro License</h3>
            <p className="text-2xl font-bold mb-2">$99</p>
            <p className="text-sm mb-4">One-time payment</p>
            <ul className="text-sm space-y-1 mb-4">
              <li>✓ Everything in Basic</li>
              <li>✓ LLM post-processing</li>
              <li>✓ Select-to-transform</li>
              <li>✓ Advanced commands</li>
              <li>✓ Lifetime updates</li>
              <li>✓ 5 device activations</li>
            </ul>
            <button
              onClick={() => handlePurchase('pro')}
              className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded"
            >
              Purchase Pro
            </button>
          </div>
        </div>
      )}

      {/* License Activation */}
      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <h3 className="font-semibold mb-2">Activate License Key</h3>
        <p className="text-sm mb-3">
          If you purchased a license, enter your license key below to activate it.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="Enter license key"
            className={`flex-1 px-3 py-2 rounded ${
              isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
            }`}
          />
          <button
            onClick={handleActivate}
            disabled={activating}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
          >
            {activating ? 'Activating...' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Add License Tab to Settings Window

In `SettingsWindow.tsx`, add:

```typescript
// Import the new component
import { LicenseSettings } from './settings/LicenseSettings';

// Add tab button
<button
  onClick={() => setActiveTab('license')}
  className={/* ... */}
>
  License
</button>

// Add tab content
{activeTab === 'license' && <LicenseSettings theme={theme} />}
```

---

## 🎬 Step 6: Test Complete Flow (End-to-End)

### Flow 1: Purchase & Activate (Test Mode)

1. **Open Trueears app** (Ctrl+Shift+S for settings)
2. **Click "License" tab** (new tab you just added)
3. **Current status should show**: "Free Tier"
4. **Click "Purchase Basic"** (or "Purchase Pro")
5. **Browser opens** with LemonSqueezy checkout
6. **Use test card**:
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`
7. **Complete purchase**
8. **Check email** for license key (sent by LemonSqueezy)
9. **Copy license key** from email
10. **Go back to Trueears** → License tab
11. **Paste license key** in activation field
12. **Click "Activate"**
13. **Success!** License status should update to "Active"

### Flow 2: Verify License Persists

1. **Close Trueears app**
2. **Restart app**
3. **Open Settings** → License tab
4. **License should still show as "Active"** ✅

### Flow 3: Test Activation Limit

1. **Try activating on multiple devices** (or simulate by clearing device ID)
2. **After reaching limit** (3 for Basic, 5 for Pro), activation should fail
3. **Error message** should indicate "Activation limit reached"

---

## 🔍 Step 7: Verify in Database

### Check Order Created

```bash
sudo -u postgres psql -d trueears_payments -c "SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;"
```

**Expected**: You should see your test order with:
- `ls_order_id` (LemonSqueezy order ID)
- `license_key` (your license key)
- `total` (4900 for Basic, 9900 for Pro - in cents)
- `test_mode: true`

### Check Customer Created

```bash
sudo -u postgres psql -d trueears_payments -c "SELECT * FROM customers ORDER BY created_at DESC LIMIT 1;"
```

**Expected**: Customer record with your email

### Check Webhook Events

```bash
sudo -u postgres psql -d trueears_payments -c "SELECT event_name, processed FROM webhook_events ORDER BY created_at DESC LIMIT 5;"
```

**Expected**: `order_created` and `license_key_created` events with `processed: true`

---

## 🔧 Step 8: Test Webhook Locally (with ngrok)

If testing with real webhook delivery from LemonSqueezy:

### Install ngrok

```bash
# macOS
brew install ngrok

# Linux
snap install ngrok
```

### Start ngrok Tunnel

```bash
ngrok http 3002
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Update LemonSqueezy Webhook URL

1. Go to LemonSqueezy Dashboard
2. Settings → Webhooks
3. Edit your webhook
4. Change URL to: `https://abc123.ngrok.io/webhooks/lemonsqueezy`
5. Save

### Make a Test Purchase

1. Go through the purchase flow
2. Complete payment
3. Check payment service logs (Terminal 1)
4. You should see: `INFO payment_service: Received webhook: order_created`

---

## 🎯 Feature Gating (Phase 9)

Once license activation works, add feature checks:

### Example: Gate LLM Features for Pro Only

In your code where you use LLM features:

```typescript
const { licenseStatus } = useLicense(); // Custom hook

const handleLLMTransform = async () => {
  if (!licenseStatus?.valid || licenseStatus.variant_name !== 'Pro License') {
    alert('LLM features require Trueears Pro. Upgrade in Settings → License.');
    return;
  }
  
  // Proceed with LLM transformation
  // ...
};
```

---

## 📊 Testing Checklist

### Backend (Payment Service)

- [ ] Payment service starts without errors
- [ ] Health check returns `OK`
- [ ] Database tables exist and are empty initially
- [ ] Can create checkout (returns valid URL)
- [ ] Webhook signature verification works
- [ ] `order_created` webhook creates database record
- [ ] License key is stored in database
- [ ] License activation API works
- [ ] Activation limit enforced

### Frontend (Desktop App)

- [ ] License tab appears in Settings
- [ ] Current license status displays correctly (Free/Active)
- [ ] Purchase buttons work and open browser
- [ ] License key input field works
- [ ] Activation button triggers API call
- [ ] Success message shows after activation
- [ ] License status updates after activation
- [ ] License persists after app restart

### Integration (End-to-End)

- [ ] Complete purchase flow works (checkout → payment → email → activation)
- [ ] Webhook is received and processed
- [ ] Database records are created correctly
- [ ] License activation works on desktop app
- [ ] Feature gating works (Pro features locked for Basic users)
- [ ] Activation limit is enforced
- [ ] Test mode checkout uses test card successfully
- [ ] Real mode checkout works in production

---

## 🐛 Troubleshooting

### Payment Service Won't Start

**Check**:
- PostgreSQL is running: `sudo systemctl status postgresql`
- Database exists: `sudo -u postgres psql -l | grep trueears_payments`
- `.env` file has all required variables
- Port 3002 is not in use: `lsof -i :3002`

### Checkout URL Not Generated

**Check**:
- Valid JWT token in request
- Variant IDs are correct in `.env`
- LemonSqueezy API key is valid
- Payment service logs for error messages

### Webhook Not Received

**Check**:
- ngrok is running (if testing locally)
- Webhook URL in LemonSqueezy is correct
- Webhook events include `order_created`
- Payment service is running and accessible
- Check LemonSqueezy webhook logs for delivery attempts

### License Activation Fails

**Check**:
- License key is correct (no typos)
- License key hasn't reached activation limit
- License key is from correct environment (test vs production)
- Payment service `/api/license/activate` endpoint is working

### Desktop App Can't Connect to Payment Service

**Check**:
- Payment service is running on port 3002
- `VITE_PAYMENT_SERVICE_URL` in `frontend/.env.local` is correct
- No CORS issues (check browser console)
- Auth token is being sent in requests

---

## 📈 Production Deployment

Before going live:

1. **Switch LemonSqueezy to Production Mode**
   - Use production API key
   - Use production webhook secret
   - Set `LEMONSQUEEZY_TEST_MODE=false`

2. **Deploy Payment Service**
   - Deploy to server (same as auth-server)
   - Update `PAYMENT_SERVICE_URL` in frontend
   - Configure HTTPS/TLS
   - Update webhook URL to production domain

3. **Test with Real Card** (small purchase)
   - Use real payment card
   - Complete full flow
   - Verify webhook received
   - Verify license activates

4. **Monitor Logs**
   - Check payment service logs
   - Check LemonSqueezy webhook delivery logs
   - Monitor database for orders

---

## 🎓 Next Steps

Once basic testing works:

1. **Implement remaining API endpoints** (Phase 2-9)
2. **Add license expiry checks** (for Basic 1-year updates)
3. **Add deactivation API** (for device transfers)
4. **Build admin dashboard** (view orders, manage licenses)
5. **Add refund handling** (process `order_refunded` webhooks)
6. **Implement usage tracking** (transcription counts for free tier)

---

## 🆘 Need Help?

- **Payment Service Issues**: Check `payment-service/DEVELOPMENT.md`
- **LemonSqueezy Setup**: See `payment-service/LEMONSQUEEZY_SETUP.md`
- **API Reference**: See `payment-service/README.md`
- **Frontend Integration**: Check `frontend/src/services/paymentService.ts`

**Ready to test?** Start with Step 1 and work through each step! 🚀