# Changelog – PawFuel v12 Web Build

All notable changes to this version of the static web build are documented here.

## v12 – 2025‑09‑21

* **Pricing page** – Added pricing screen implementing the new subscription model: $1.99/month or $18/year for users, $10/month or $90/year for shop owners, plus 3 % commission. The page respects a global free period defined in `billingStartAt` and displays a 50 % loyalty discount for users who joined before the billing start, valid for the first three paid months.
* **Loyalty discount logic** – Tracks the first visit date in local storage and compares it to the billing start; applies a discounted price when appropriate.
* **Shop Owner portal** – Added a UI section where shop owners can upload their catalogue. The upload is UI‑only with a mock success message and an approval status indicator.
* **Commission calculation** – Added an Orders page where users can enter an order subtotal and see the commission calculated client‑side using the rate from `env.json`. Orders are stored in memory for the session and summarised in PDF.
* **PDF export** – Added a “Download PDF” button that creates a simple PDF summary of the orders using a minimal in‑browser PDF generator. This works in offline mode without relying on window.open.
* **Bilingual support** – Included English and Arabic translations for navigation and key UI labels. The language toggle updates text, adjusts text direction (`ltr`/`rtl`) and switches numeral formatting.
* **Configurable environment** – Added `Configs/env.json` to centralise flags (environment, billing start, pricing, commission, feature toggles, loyalty settings). Most UI behaviour (e.g. pricing visibility, canary badge) is driven by this configuration.
* **Canary badge** – Added a small canary label that appears when `showCanary` is true in the config, indicating the build and version.
* **Responsive & offline‑ready** – Ensured all links are relative and included a `<base href="./">`; removed any service worker registration to guarantee that the build runs inside a WKWebView or local file environment.