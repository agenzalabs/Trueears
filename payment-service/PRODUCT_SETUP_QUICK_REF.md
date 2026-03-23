# LemonSqueezy Product Setup - Quick Reference (One-Time Payment)

## 🎯 Products to Create

### Product 1: Trueears Basic License
**Target**: Individual users who want unlimited smart dictation
**Model**: One-time payment (NOT subscription)

| Variant | Price | Payment Type | License |
|---------|-------|--------------|---------|
| Basic License | $49 | One-time | 3 device activations, 1 year updates |

**Features**:
- ✅ Lifetime access (pay once, use forever)
- ✅ Unlimited transcriptions
- ✅ Context-aware formatting
- ✅ App profiles
- ✅ Custom system prompts
- ✅ Language switching

---

### Product 2: Trueears Pro License
**Target**: Power users who want LLM features and advanced controls
**Model**: One-time payment (NOT subscription)

| Variant | Price | Payment Type | License |
|---------|-------|--------------|---------|
| Pro License | $99 | One-time | 5 device activations, lifetime updates |

**Features**:
- ✅ Everything in Basic
- ✅ LLM post-processing
- ✅ Select-to-transform
- ✅ Advanced voice commands
- ✅ Export history
- ✅ Custom hotkeys
- ✅ Lifetime updates
- ✅ Priority support

---

## 🔧 Configuration Checklist

### After Each Step, Update `.env`:

1. **Create Store** → Copy **Store ID** → `LEMONSQUEEZY_STORE_ID=your_store_id`
2. **Create Basic License variant** → Copy **Variant ID** → `LEMONSQUEEZY_VARIANT_ID_BASIC=?`
3. **Create Pro License variant** → Copy **Variant ID** → `LEMONSQUEEZY_VARIANT_ID_PRO=?`
4. **Generate API Key** → `LEMONSQUEEZY_API_KEY=your_api_key`
5. **Create Webhook** → Copy **Signing Secret** → `LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_signing_secret`

### Remove Old Subscription Variants:
❌ Delete: `LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY`
❌ Delete: `LEMONSQUEEZY_VARIANT_ID_BASIC_ANNUAL`
❌ Delete: `LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY`
❌ Delete: `LEMONSQUEEZY_VARIANT_ID_PRO_ANNUAL`

**You only need 2 variant IDs now (Basic + Pro one-time licenses)**

---

## 📋 Webhook Events to Select

When creating webhook at `https://trueearsal.com/webhooks/lemonsqueezy`:

**Required** (check these boxes):
- ✅ `order_created` ⭐ **Most important for one-time payment**
- ✅ `order_refunded`
- ✅ `license_key_created` ⭐ **For license delivery**
- ✅ `license_key_updated`

**Skip** (NOT needed for one-time payment):
- ❌ `subscription_created` (we're not using subscriptions)
- ❌ `subscription_updated`
- ❌ `subscription_cancelled`
- ❌ `subscription_expired`
- ❌ `subscription_paused`
- ❌ `subscription_resumed`

---

## 🔑 License Key Setup (IMPORTANT)

For each product:
1. Go to **Products** → Select product → **License Keys**
2. ✅ **Enable License Keys**
3. Configure:
   - **Activation Limit**: 
     - Basic: 3 devices
     - Pro: 5 devices
   - **Expiry**: Never (lifetime license)
   - **Key Format**: Default

4. In product settings:
   - ✅ Check "Send license key email" (required!)
   - Set receipt button text: "Download & Activate"
   - Set receipt button URL: `https://trueearsal.com/download`

---

## 🧪 Test Mode

**Test Card**: `4242 4242 4242 4242` / Expiry: `12/34` / CVC: `123`

For local testing:
1. Start service: `cd payment-service && cargo run`
2. Start ngrok: `ngrok http 3002`
3. Update webhook URL to ngrok HTTPS URL
4. Make test purchase
5. Check for `order_created` webhook (not `subscription_created`)
6. Verify license key received via email

---

## 📄 Product Descriptions (Copy-Paste Ready)

### Basic License Description
```
Lifetime access to unlimited AI voice dictation with context-aware 
formatting. Pay once, use forever.

✅ Lifetime access to Trueears Basic
✅ Unlimited voice transcriptions (forever)
✅ Context-aware formatting
✅ Pre-configured app profiles (VS Code, Slack, Notion, etc.)
✅ Custom system prompts
✅ Language switching per app
✅ 1 year of free updates
✅ Email support

💰 One-Time Payment Benefits:
🎉 Pay $49 once, use forever
🎉 No recurring charges
🎉 No subscription hassles
🎉 Instant activation via license key
🎉 3 device activations included
```

### Pro License Description
```
Lifetime access to the ultimate AI dictation experience with 
LLM-powered features, select-to-transform, and priority support. 
Pay once, own it forever.

✅ Everything in Basic License, plus:
✅ LLM post-processing (GPT-powered formatting)
✅ Select-to-transform (select text, speak edits)
✅ Advanced voice commands
✅ Export dictation history
✅ Custom hotkeys configuration
✅ Priority support
✅ Lifetime updates (not just 1 year)

💰 Pro Benefits:
🎉 Pay $99 once, own it forever
🎉 Lifetime updates included
🎉 No subscription fees ever
🎉 Priority support & early access
🎉 5 device activations included
🎉 Best value for power users
```

---

## 🆚 One-Time Payment vs Subscription

| Aspect | Subscription (OLD) | One-Time Payment (NEW) |
|--------|-------------------|------------------------|
| **Products** | 2 products | 2 products |
| **Variants** | 4 (monthly/annual) | 2 (basic/pro) |
| **Payment** | Recurring | One-time |
| **Pricing** | $9.99/mo or $99/yr | $49 or $99 once |
| **Main Webhook** | `subscription_created` | `order_created` |
| **Unlocking** | Check subscription status | Validate license key |
| **Updates** | While subscribed | Basic: 1yr, Pro: lifetime |
| **Activations** | N/A | Basic: 3, Pro: 5 devices |

---

## 📊 Pricing Comparison Table (For Website)

| Feature | Free | Basic License | Pro License |
|---------|------|---------------|-------------|
| **Transcriptions** | 100/month | **Unlimited** | **Unlimited** |
| **Context-Aware** | ❌ | ✅ | ✅ |
| **LLM Features** | ❌ | ❌ | ✅ |
| **Select-to-Transform** | ❌ | ❌ | ✅ |
| **Custom Hotkeys** | ❌ | ❌ | ✅ |
| **Updates** | - | 1 year | **Lifetime** |
| **Activations** | - | 3 devices | 5 devices |
| **Support** | Community | Email | Priority |
| **Price** | **Free** | **$49** | **$99** |
| **Payment** | - | **One-time** | **One-time** |

---

## ⚙️ Code Changes Required

### Update `payment-service/.env`:
```env
# Only 2 variants now (remove the 4 subscription variants)
LEMONSQUEEZY_VARIANT_ID_BASIC=12345   # Copy from LemonSqueezy
LEMONSQUEEZY_VARIANT_ID_PRO=12346     # Copy from LemonSqueezy

# Remove these lines:
# LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY
# LEMONSQUEEZY_VARIANT_ID_BASIC_ANNUAL
# LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY
# LEMONSQUEEZY_VARIANT_ID_PRO_ANNUAL
```

### Update `src/config.rs`:
```rust
pub struct Config {
    // Change from 4 subscription variants to 2 one-time variants
    pub variant_id_basic: String,    // NEW
    pub variant_id_pro: String,      // NEW
    
    // Remove:
    // pub variant_id_basic_monthly: String,
    // pub variant_id_basic_annual: String,
    // pub variant_id_pro_monthly: String,
    // pub variant_id_pro_annual: String,
}
```

### Add License Key Fields to `orders` Table:
```sql
ALTER TABLE orders ADD COLUMN license_key VARCHAR(255);
ALTER TABLE orders ADD COLUMN license_key_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE orders ADD COLUMN activations_used INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN activations_limit INTEGER DEFAULT 3;
```

---

## 🚀 Next Steps After LemonSqueezy Setup

1. ✅ Create 2 products in LemonSqueezy (Basic + Pro licenses)
2. ✅ Copy 2 variant IDs to `.env`
3. ✅ Update webhook URL to include `/webhooks/lemonsqueezy`
4. ✅ Copy webhook signing secret to `.env`
5. ✅ Update `src/config.rs` to use 2 variants instead of 4
6. ✅ Create database migration for license key fields
7. ✅ Implement Phase 2 (handle `order_created` webhook)
8. ✅ Implement license key activation API

---

## 📁 Implementation Changes

**OLD Implementation Focus** (Subscription):
- Phase 4: Subscription Created Handler
- Phase 7: Subscription Status Query
- Phase 8: Cancel/Pause/Resume subscriptions

**NEW Implementation Focus** (One-Time Payment):
- Phase 4: Order Created Handler (handle purchase)
- Phase 7: License Key Validation API
- Phase 8: License Activation/Deactivation API

---

**Full Guide**: See `LEMONSQUEEZY_SETUP.md` for detailed step-by-step instructions for one-time payment model.
