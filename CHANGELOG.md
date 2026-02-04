# Changelog

All notable changes to UserVault will be documented in this file.

---

## [1.6.0] - 2026-02-04

### 🎖️ Friend Badges

#### Dual Badge Assignment
- When creating a Friend Badge, both the creator and recipient now receive a copy
- Badge creators can now showcase the badges they've gifted to others

#### File Upload Support
- Replaced URL input with direct file upload for badge icons
- Increased upload limit to 100MB (PNG/JPG/GIF supported)
- Added image preview before submission

### ⚡ Performance Optimizations

#### Dashboard Background Fix
- Replaced Aurora WebGL effects with performant static CSS gradients
- Fixed buggy/flickering dashboard background that randomly disappeared
- Removed multiple WebGL renderers that caused excessive GPU load
- Affected components: OverviewStats, StatCard, TopLinksChart, RegisteredUsersList

---

## [1.5.0] - 2026-02-03

### 🔐 Security & Encryption

#### AES-256-GCM Encrypted AI Chatbot
- Implemented end-to-end encryption for the AI chatbot using AES-256-GCM
- All chat traffic now routes through the secure API proxy (`api.uservault.cc`)
- Supabase project URLs are completely hidden from network inspection
- New `encrypted-chat-ai` Edge Function handles encrypted payloads with streaming support
- Session-derived encryption keys for secure communication

#### Secure Edge Function Routing
- Created `invokeSecure` helper (`src/lib/secureEdgeFunctions.ts`) for all Edge Function calls
- All sensitive API calls now route through the Cloudflare proxy
- Automatic authentication header injection for logged-in users
- Fallback to anon key for public endpoints

#### Encrypted Badge Icon Uploads
- Badge request icon uploads now use AES-256-GCM client-side encryption
- Fixed storage path to comply with RLS policies (`${userId}/badge-icons/`)
- Added magic-byte validation to prevent MIME-type spoofing attacks
- All badge request API calls now routed through secure proxy
- Secure random filename generation prevents enumeration attacks

### 🐛 Bug Fixes

#### Badge Request Icon Upload Fixed
- Fixed "Failed to upload icon" error caused by incorrect storage path
- Path now correctly starts with user ID as required by RLS policies
- Added comprehensive file validation before upload

#### MFA Email Verification Fixed
- Fixed double-parsing error in `mfa-email-otp` Edge Function that prevented email code verification
- Email OTP codes now correctly validate during 2FA login flow
- Both TOTP and Email-based MFA methods work reliably

#### Promo Code System Restored
- Fixed promo code validation - users can now apply promo codes again
- Created new `validate-promo-code` Edge Function with service-role access
- Resolved RLS policy blocking normal users from reading `promo_codes` table
- Promo code validation includes:
  - Expiration date checking
  - Maximum uses limit enforcement
  - Per-user usage tracking (prevents reuse)
- Both Gift (100%) and Discount codes work correctly
- Free premium activation with gift codes functions as expected

### 🔧 Technical Improvements

- Updated Cloudflare Worker (`api-proxy.js`) with enhanced CORS headers
- Added support for `x-encrypted` and `x-session-token` headers in proxy
- All payment verification calls (`verify-paypal-payment`) now use secure proxy routing
- Removed direct Supabase client calls from premium checkout flow

---

## Previous Versions

See project commit history for earlier changes.
