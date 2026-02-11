# LemonSqueezy Setup Guide for Trueears (One-Time Payment)

Complete guide to setting up products, variants, and webhooks in LemonSqueezy for the Trueears payment service using a **one-time payment model**.

## 📋 Overview

Trueears is a **minimalist AI voice dictation desktop application** that helps users dictate text with context-aware formatting. The payment service will offer **one-time lifetime purchases** instead of subscriptions.

## 🎯 Product Strategy (One-Time Payment Model)

### Free Tier (Always Available)
- ✅ Basic voice dictation
- ✅ Auto-paste to active window
- ✅ Global hotkey (Ctrl+Shift+K)
- ✅ 3 recording modes (Auto, Toggle, Push-to-Talk)
- ⚠️ Limited to 100 transcriptions per month
- ⚠️ No context-aware formatting
- ⚠️ No LLM post-processing
- ⚠️ No select-to-transform

### One-Time Purchase Tiers

#### **Basic License** - Lifetime Access
- ✅ Everything in Free
- ✅ **Unlimited transcriptions** (forever)
- ✅ **Context-aware formatting** (detects active app)
- ✅ **App profiles** (VS Code, Slack, Notion, etc.)
- ✅ **Custom system prompts**
- ✅ **Language switching per app**
- ✅ Free updates for 1 year
- ✅ Email support

**Pricing**: **$49** one-time payment

#### **Pro License** - Lifetime + Premium Features
- ✅ Everything in Basic
- ✅ **LLM post-processing** (GPT-powered formatting)
- ✅ **Select-to-transform** (select text, speak transformation)
- ✅ **Advanced voice commands**
- ✅ **Export dictation history**
- ✅ **Custom hotkeys**
- ✅ **Priority updates** (early access to new features)
- ✅ **Lifetime updates** (not just 1 year)
- ✅ Priority support

**Pricing**: **$99** one-time payment

---

## 🏗️ Step-by-Step Setup

### Step 1: Create Store (If Not Done)

1. Log in to [LemonSqueezy Dashboard](https://app.lemonsqueezy.com/)
2. Go to **Settings** → **Stores**
3. If you don't have a store, click **New Store**
4. Fill in:
   - **Store Name**: Trueears
   - **Store Domain**: trueears (or custom domain later)
   - **Currency**: USD
5. Click **Create Store**
6. **Copy your Store ID** - you'll need this for `.env`

### Step 2: Create Product 1 - "Trueears Basic License"

1. Go to **Products** → **New Product**
2. Fill in product details:

#### General Information
```
Product Name: Trueears Basic License
Slug: trueears-basic
Description: 
Lifetime access to unlimited AI voice dictation with context-aware 
formatting. Pay once, use forever.

Category: Software
Product Type: Digital Download (or Software as a Service)
```

#### Product Image
- Upload Trueears logo or icon (recommended: 1200x630px)

#### Pricing Type
- Select: **Single Payment** (NOT subscription)

#### Create Variants

**Variant 1: Basic License**
```
Name: Basic License
Price: $49.00
Payment Type: One-time
License Keys: Enable (recommended - for activation)
Description: Lifetime access, 1 year of updates included
```

After creating, **copy the Variant ID** → this goes in `.env` as `LEMONSQUEEZY_VARIANT_ID_BASIC`

#### Product Features (Add to Description)
```markdown
### What's Included:
✅ Lifetime access to Trueears Basic
✅ Unlimited voice transcriptions (forever)
✅ Context-aware formatting
✅ Pre-configured app profiles (VS Code, Slack, Notion, etc.)
✅ Custom system prompts
✅ Language switching per app
✅ Auto-paste to active window
✅ 3 recording modes
✅ 1 year of free updates
✅ Email support

### One-Time Payment Benefits:
🎉 Pay once, use forever
🎉 No recurring charges
🎉 No subscription hassles
🎉 Instant activation
```

#### License Key Configuration
1. Go to **Products** → **Trueears Basic License** → **License Keys**
2. Enable license keys
3. Configure:
   - **Activation Limit**: 3 devices (reasonable for personal use)
   - **Expiry**: Never (or set to 1 year if you want to enforce update limits)
   - **Key Format**: Default (or customize)

#### After Purchase Actions
- **Redirect URL**: `https://trueearsal.com/purchase/success`
- **Email**: ✅ Check "Send license key email" (REQUIRED for one-time purchases)
- **Receipt Button Text**: "Download & Activate"
- **Receipt Button URL**: `https://trueearsal.com/download`

### Step 3: Create Product 2 - "Trueears Pro License"

1. Go to **Products** → **New Product**
2. Fill in product details:

#### General Information
```
Product Name: Trueears Pro License
Slug: trueears-pro
Description: 
Lifetime access to the ultimate AI dictation experience with 
LLM-powered features, select-to-transform, and priority support. 
Pay once, use forever with lifetime updates.

Category: Software
Product Type: Digital Download (or Software as a Service)
```

#### Pricing Type
- Select: **Single Payment**

#### Create Variants

**Variant 1: Pro License**
```
Name: Pro License
Price: $99.00
Payment Type: One-time
License Keys: Enable (recommended)
Description: Lifetime access + lifetime updates + all premium features
```

**copy the Variant ID** → `.env`: `LEMONSQUEEZY_VARIANT_ID_PRO`

#### Product Features
```markdown
### What's Included:
✅ Everything in Basic License, plus:
✅ LLM post-processing (GPT-powered formatting)
✅ Select-to-transform (select text, speak edits)
✅ Advanced voice commands
✅ Export dictation history
✅ Custom hotkeys configuration
✅ Priority feature updates (early access)
✅ Lifetime updates (not just 1 year)
✅ Priority support
✅ Team license (3 activations included)

### Pro Benefits:
🎉 Pay $99 once, own it forever
🎉 Lifetime updates included
🎉 No subscription fees ever
🎉 Priority support & features
🎉 Best value for power users
```

#### License Key Configuration
1. Enable license keys
2. Configure:
   - **Activation Limit**: 5 devices (more generous for Pro users)
   - **Expiry**: Never
   - **Key Format**: Default

### Step 4: Configure Webhook

1. Go to **Settings** → **Webhooks**
2. Click **Add endpoint**

#### Webhook Configuration
```
Endpoint URL: https://trueearsal.com/webhooks/lemonsqueezy

⚠️ IMPORTANT: Must include full path /webhooks/lemonsqueezy

For local development with ngrok:
https://your-ngrok-url.ngrok.io/webhooks/lemonsqueezy
```

#### Select Events (Check these boxes):

**Order Events** (REQUIRED for one-time payments):
- ✅ `order_created` ⭐ **Most important**
- ✅ `order_refunded`

**License Key Events** (REQUIRED if using license keys):
- ✅ `license_key_created`
- ✅ `license_key_updated`

**Optional Events** (for future features):
- ☐ `subscription_created` (skip - not using subscriptions)
- ☐ `subscription_updated` (skip)
- ☐ `subscription_cancelled` (skip)

#### Signing Secret
1. Click **Create Webhook**
2. **CRITICAL**: Copy the **Signing Secret** displayed
3. Save it immediately - you can't view it again!
4. Add to `.env` as `LEMONSQUEEZY_WEBHOOK_SECRET=<secret>`

### Step 5: Get API Key

1. Go to **Settings** → **API**
2. Click **Create API Key**
3. Give it a name: "Trueears Payment Service"
4. Copy the API key (starts with `eyJ0eXAi...`)
5. Add to `.env` as `LEMONSQUEEZY_API_KEY=<key>`

---

## ⚙️ Update `.env` Configuration

After completing the setup, update your `payment-service/.env`:

```env
# LemonSqueezy API
LEMONSQUEEZY_API_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...  # From Step 5
LEMONSQUEEZY_STORE_ID=290936  # From Step 1 (you already have this)
LEMONSQUEEZY_WEBHOOK_SECRET=your_real_signing_secret_here  # From Step 4

# Product Variants - UPDATE THESE with real IDs (one-time payment variants)
LEMONSQUEEZY_VARIANT_ID_BASIC=12345  # From Step 2 (Basic License)
LEMONSQUEEZY_VARIANT_ID_PRO=12346    # From Step 3 (Pro License)

# Remove subscription variant IDs (not needed for one-time payment)
# LEMONSQUEEZY_VARIANT_ID_BASIC_MONTHLY - DELETE THIS
# LEMONSQUEEZY_VARIANT_ID_BASIC_ANNUAL - DELETE THIS
# LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY - DELETE THIS
# LEMONSQUEEZY_VARIANT_ID_PRO_ANNUAL - DELETE THIS

# Environment
IS_PRODUCTION=false
LEMONSQUEEZY_TEST_MODE=true  # Keep true for development
```

---

## 🔄 Update Payment Service Code for One-Time Payments

### Update `src/config.rs`

Replace the subscription variant config with:

```rust
pub struct Config {
    // ... existing fields ...
    
    // One-time payment variants (replace subscription variants)
    pub variant_id_basic: String,
    pub variant_id_pro: String,
    
    // Remove these:
    // pub variant_id_basic_monthly: String,
    // pub variant_id_basic_annual: String,
    // pub variant_id_pro_monthly: String,
    // pub variant_id_pro_annual: String,
}

impl Config {
    pub fn from_env() -> Result<Self, ConfigError> {
        // ... existing code ...
        
        let variant_id_basic = env::var("LEMONSQUEEZY_VARIANT_ID_BASIC")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_VARIANT_ID_BASIC".to_string()))?;
        
        let variant_id_pro = env::var("LEMONSQUEEZY_VARIANT_ID_PRO")
            .map_err(|_| ConfigError::MissingEnvVar("LEMONSQUEEZY_VARIANT_ID_PRO".to_string()))?;
        
        Ok(Config {
            // ... existing fields ...
            variant_id_basic,
            variant_id_pro,
        })
    }
}
```

### Update Database Schema

**Important**: One-time payments use **Orders** instead of **Subscriptions** as the primary entity.

#### Migration: Update orders table to include license key

```sql
-- Add to migrations/003_create_orders.sql or create new migration
ALTER TABLE orders ADD COLUMN license_key VARCHAR(255);
ALTER TABLE orders ADD COLUMN license_key_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE orders ADD COLUMN activations_used INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN activations_limit INTEGER DEFAULT 3;

CREATE INDEX idx_orders_license_key ON orders(license_key);
```

#### Update `src/models/order.rs`

```rust
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub ls_order_id: i64,
    pub subscription_id: Option<Uuid>,  // Will be NULL for one-time payments
    pub status: OrderStatus,
    pub total: i64,
    pub currency: String,
    pub refunded_amount: i64,
    pub test_mode: bool,
    
    // License key fields (for one-time payment)
    pub license_key: Option<String>,
    pub license_key_status: Option<String>,  // active, inactive, expired
    pub activations_used: i32,
    pub activations_limit: i32,
    
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

---

## 🧪 Testing with Test Mode

LemonSqueezy provides a **Test Mode** for safe testing without real charges.

### Enable Test Mode

1. In LemonSqueezy dashboard, toggle **Test Mode** (top right corner)
2. Create test products and variants (same as above)
3. Use test mode API key
4. Set `LEMONSQUEEZY_TEST_MODE=true` in `.env`

### Test Payment Cards

Use these test cards in LemonSqueezy checkout:

**Successful Payment**:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Card Declined**:
- Card: `4000 0000 0000 0002`

**Insufficient Funds**:
- Card: `4000 0000 0000 9995`

### Test Webhook Locally

1. Start payment service: `cd payment-service && cargo run`
2. Start ngrok: `ngrok http 3002`
3. Copy ngrok HTTPS URL
4. Update webhook URL in LemonSqueezy dashboard
5. Make a test purchase
6. Verify `order_created` webhook received in service logs
7. Check license key is stored in database

---

## 📊 Product Comparison Table (For Marketing)

Use this table on your pricing page:

| Feature | Free | Basic License | Pro License |
|---------|------|---------------|-------------|
| Voice Transcriptions | 100/month | **Unlimited** | **Unlimited** |
| Context-Aware Formatting | ❌ | ✅ | ✅ |
| App Profiles | ❌ | ✅ | ✅ |
| Custom System Prompts | ❌ | ✅ | ✅ |
| Language Switching | ❌ | ✅ | ✅ |
| LLM Post-Processing | ❌ | ❌ | ✅ |
| Select-to-Transform | ❌ | ❌ | ✅ |
| Advanced Voice Commands | ❌ | ❌ | ✅ |
| Export History | ❌ | ❌ | ✅ |
| Custom Hotkeys | ❌ | ❌ | ✅ |
| Updates Included | - | 1 year | **Lifetime** |
| Activations | - | 3 devices | 5 devices |
| Support | Community | Email | Priority |
| **Price** | **Free** | **$49** | **$99** |
| **Payment** | - | **One-time** | **One-time** |

---

## 🎨 Checkout Customization

### Custom Checkout Page

1. Go to **Products** → Select product → **Checkout**
2. Customize:
   - **Logo**: Upload Trueears logo
   - **Primary Color**: Match your brand (e.g., `#2563eb`)
   - **Background**: Light or dark theme
   - **Thank You Message**: "Thank you for purchasing Trueears! Your license key has been emailed to you."

### Email Templates

1. Go to **Settings** → **Emails**
2. Customize:
   - **Order Confirmation**: Include license key + activation instructions
   - **Receipt Email**: Add quick start guide link + download button

**Sample Order Confirmation Email**:
```
Subject: Your Trueears License Key & Download Link

Hi [Customer Name],

Thank you for purchasing Trueears [Basic/Pro]!

Your License Key: [LICENSE_KEY]

Download Trueears: https://trueearsal.com/download

Activation Instructions:
1. Download and install Trueears
2. Open Settings (Ctrl+Shift+S)
3. Enter your license key
4. Start dictating!

Need help? Reply to this email or visit https://trueearsal.com/support

Best regards,
The Trueears Team
```

---

## 🔑 License Key Management

### Viewing License Keys

1. Go to **Products** → Select product → **License Keys**
2. View all issued keys:
   - Key value
   - Customer email
   - Activation status
   - Activations used / limit
   - Order ID

### Deactivating a License

If a customer needs to transfer their license:
1. Find the license key
2. Click **Deactivate**
3. Customer can re-activate on a new device

### Extending Activation Limits

For Pro customers who need more devices:
1. Find their license key
2. Click **Edit**
3. Increase **Activation Limit**

---

## 📈 Analytics & Reporting

LemonSqueezy provides built-in analytics:

1. Go to **Analytics** in dashboard
2. Track:
   - Total revenue
   - Sales by product
   - Refund rate
   - Average order value (AOV)
   - Conversion rate

**Key Metrics for One-Time Payment Model**:
- Total lifetime revenue (cumulative sales)
- Sales velocity (sales per day/week/month)
- Product mix (Basic vs Pro sales ratio)
- Refund rate (should be <5%)

---

## 🔒 Security Checklist

Before going live:

- ✅ Switch to **Production Mode** in LemonSqueezy
- ✅ Use **production API key** (not test key)
- ✅ Update `LEMONSQUEEZY_TEST_MODE=false` in `.env`
- ✅ Verify webhook URL uses HTTPS (not HTTP)
- ✅ Test webhook signature verification
- ✅ Confirm all variant IDs are correct (only 2 variants now)
- ✅ Test full checkout → license key delivery flow
- ✅ Verify license key activation in desktop app
- ✅ Test license key with activation limit (try activating on 4th device)
- ✅ Test order refund flow

---

## 🆘 Troubleshooting

### Webhook Not Received

**Check**:
1. Service is running: `curl http://localhost:3002/health`
2. ngrok tunnel is active (if local dev)
3. Webhook URL in LemonSqueezy is correct with `/webhooks/lemonsqueezy` path
4. Firewall/security groups allow incoming traffic
5. Check LemonSqueezy webhook logs for delivery attempts
6. Webhook events include `order_created` (not just subscriptions)

### License Key Not Received

**Check**:
1. License keys are enabled for the product
2. "Send license key email" is checked in product settings
3. Check customer's spam/junk folder
4. Verify webhook `license_key_created` is selected
5. Check LemonSqueezy email logs

### Signature Verification Fails

**Check**:
1. `LEMONSQUEEZY_WEBHOOK_SECRET` matches dashboard secret
2. No extra spaces or newlines in `.env` value
3. Service is reading the correct `.env` file
4. Webhook payload isn't being modified by proxy/CDN

### Checkout URL Invalid

**Check**:
1. Variant IDs are correct (only 2 now: basic and pro)
2. API key has permissions (not read-only)
3. Test mode setting matches product mode
4. Store ID is correct
5. Using correct endpoint (one-time payment, not subscription)

---

## 📚 Additional Resources

- [LemonSqueezy Documentation](https://docs.lemonsqueezy.com/)
- [LemonSqueezy API Reference](https://docs.lemonsqueezy.com/api)
- [Webhook Events Guide](https://docs.lemonsqueezy.com/help/webhooks)
- [License Key Management](https://docs.lemonsqueezy.com/help/license-keys)

---

## ✅ Setup Completion Checklist

- [ ] Store created and Store ID copied
- [ ] Product "Trueears Basic License" created
  - [ ] Basic License variant created ($49 one-time) (ID copied)
  - [ ] License keys enabled
- [ ] Product "Trueears Pro License" created
  - [ ] Pro License variant created ($99 one-time) (ID copied)
  - [ ] License keys enabled
- [ ] Webhook endpoint configured
  - [ ] `order_created` event selected ⭐
  - [ ] `order_refunded` event selected
  - [ ] `license_key_created` event selected
  - [ ] Signing secret copied
- [ ] API key generated and copied
- [ ] `.env` file updated with 2 variant IDs (basic, pro only)
- [ ] Code updated to remove subscription logic
- [ ] Database migration added for license key fields
- [ ] Test purchase completed successfully
- [ ] `order_created` webhook received
- [ ] License key delivered via email
- [ ] License key activation tested in desktop app

**Once complete, you're ready to implement Phase 2 (Webhook Verification) for one-time payment events!** 🚀

---

## 🎯 Key Differences: One-Time Payment vs Subscription

| Aspect | Subscription Model | One-Time Payment Model |
|--------|-------------------|------------------------|
| **Product Type** | Subscription | Single Payment |
| **Payment** | Recurring (monthly/yearly) | One-time purchase |
| **Variants** | 4 (Basic Monthly, Basic Annual, Pro Monthly, Pro Annual) | 2 (Basic License, Pro License) |
| **Primary Webhook** | `subscription_created` | `order_created` |
| **User Unlocking** | Check subscription status | Check order + validate license key |
| **Database Focus** | `subscriptions` table | `orders` table + license key fields |
| **Revenue Model** | Monthly Recurring Revenue (MRR) | Lifetime Value (LTV) per customer |
| **Customer Management** | Customer portal (pause/cancel) | License key management (activate/deactivate) |
| **Updates** | Included while subscribed | Basic: 1 year, Pro: lifetime |

---

## 💡 Implementation Notes for One-Time Payment

### Phase 2-9 Adjustments:

1. **Phase 2 (Webhook Verification)**: Handle `order_created` instead of `subscription_created`
2. **Phase 3 (Event Logging)**: Log order events, not subscription events
3. **Phase 4**: Replace "Subscription Created Handler" with "Order Created Handler"
4. **Phase 5 (Checkout)**: Create checkout for one-time payment variants
5. **Phase 6 (Status Query)**: Query order status + license key validation
6. **Phase 7-8**: Remove subscription management (cancel, pause, resume, upgrade/downgrade)
7. **Add New Phase**: License key activation/deactivation API

### New API Endpoints Needed:

- `POST /api/checkout` - Create checkout (same, but for one-time variants)
- `GET /api/orders/me` - Get user's purchase history
- `POST /api/license/activate` - Activate license key on device
- `POST /api/license/deactivate` - Deactivate license key from device
- `GET /api/license/status` - Check license key validity

**Ready to update the implementation plan for one-time payment model!** 🚀