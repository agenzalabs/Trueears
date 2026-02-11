# Quick Fix for Desktop App Compilation

## Issue

The desktop app won't compile on Linux because:
1. Missing icon file
2. Windows-specific code not properly gated

## Quick Solution: Test Payment Service Only

Since payment testing doesn't require the desktop app to run, you can:

### Option 1: Test Payment Service Standalone (RECOMMENDED)

```bash
# Just test the payment service
cd payment-service
cargo run

# In another terminal, test it
curl http://localhost:3002/health
```

Then follow `TEST_QUICK_START.md` for manual testing via browser.

### Option 2: Fix Desktop App for Linux

If you need to run the desktop app on Linux, here's what to do:

#### Fix 1: Add Placeholder Icon

```bash
cd backend/icons
# Create a 256x256 PNG icon or use ImageMagick
convert -size 256x256 xc:blue icon.png
```

Or download any PNG image and rename it to `icon.png`.

#### Fix 2: Conditionally Compile Windows Code

The `installed_apps.rs` file is Windows-only. Add this at the top:

```rust
#[cfg(target_os = "windows")]
// ... all existing code ...

#[cfg(not(target_os = "windows"))]
pub fn get_installed_apps() -> Result<Vec<InstalledApp>, String> {
    Ok(vec![]) // Return empty on non-Windows
}
```

### Option 3: Run on Windows

The Trueears app is designed for Windows. If you have Windows available:
- Run it on Windows
- Desktop app will compile and run properly
- Full integration testing possible

## Recommended Testing Approach

Since you're on **Linux**, use this workflow:

1. **Payment Service** (Linux) ✅ Works
2. **Auth Server** (Linux) ✅ Works  
3. **Manual Browser Testing** ✅ Works (LemonSqueezy checkout)
4. **Desktop App** ⚠️ Skip for now (Windows-specific)

**You can still test the entire payment flow** without running the desktop app:

1. Payment service runs on Linux ✅
2. Create checkout via LemonSqueezy dashboard
3. Complete purchase in browser
4. Webhook is received by payment service
5. License key stored in database
6. Verify with curl/Postman

**Full desktop integration** requires Windows machine.

---

**For now: Focus on payment service testing per `TEST_QUICK_START.md`** 🚀
