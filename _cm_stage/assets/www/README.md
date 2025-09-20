# PawFuel Update Pack v12 (Prod + Staging)

This pack contains **drop-in files** to apply the latest locked updates (pricing, loyalty, shop commission, prod/staging separation) to your existing Xcode project.

> You already have signing/capabilities + two bundle IDs. Follow these steps **exactly** and you'll archive for TestFlight right away.

## What’s inside
- `Configs/shared.xcconfig` – shared settings
- `Configs/prod.xcconfig` & `Configs/staging.xcconfig` – per-target overrides
- `Info/Info.prod.plist` & `Info/Info.staging.plist` – per-target Info.plist templates
- `Sources/App.swift` – SwiftUI entry point
- `Sources/Config.swift` – reads values from Info.plist
- `Sources/WebView.swift` – WKWebView wrapper loading your PWA endpoint
- `Resources/AssetsPlaceholder/` – placeholder icons
- `COPY.txt` – ready-to-paste in‑app copy for pricing/FAQ banners

## How to apply (5–10 min)
1. **Create/verify two targets** in Xcode:
   - Target A (Prod): **PawFuel** – Bundle ID: `com.pawfuel.app`
   - Target B (Staging): **PawFuel • Staging** – Bundle ID: `com.pawfuel.app.staging`

2. In your project root, create a folder `Configs/` and add:
   - `shared.xcconfig` (apply to both targets under Build Settings → Info → Configuration)
   - `prod.xcconfig` → set as base config for **PawFuel** (Debug/Release)
   - `staging.xcconfig` → set as base config for **PawFuel • Staging** (Debug/Release)

3. Replace or **merge** your target Info.plist files with the templates in `Info/`:
   - Prod target uses `Info.prod.plist`
   - Staging target uses `Info.staging.plist`

4. Add the Swift files in `Sources/` to **both targets** (check the box in File Inspector).

5. (Optional) Drop the pricing copy from `COPY.txt` into your pricing screen / banner components.

6. Build scheme **PawFuel** → **Archive** → **Distribute to App Store Connect (TestFlight)**.
   Repeat for **PawFuel • Staging** if you want staging on TestFlight.

### Changing the anniversary date
Edit `BILLING_START_AT` in the per-target `.xcconfig` files (ISO 8601 UTC).

---

## Sanity checklist before Archive
- Targets point to the correct **Bundle ID** and use the matching **provisioning profiles** (or “Automatically manage signing” with your team).
- `SERVER_BASE_URL` points to your PWA URL (prod vs staging). You can leave a placeholder for now.
- Icons/names distinct for staging so testers don’t confuse them.
- Build succeeds in `Release` config.

Need help wiring Stripe/IAP later or enabling offline cache? We’ll do that next.
