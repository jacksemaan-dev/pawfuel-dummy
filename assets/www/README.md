# PawFuel v12 Web Build

This package contains a self‑contained static web version of **PawFuel v12** that implements the features described in the accompanying specification. It is designed to run locally inside a **Flutter `WKWebView`** or any other embedded webview using local files. There are no external network dependencies – all assets, styles and scripts are included.

## How to use in Flutter

1. **Place the build under your Flutter assets**

   Copy the entire directory (e.g. `PawFuel_v12_web_build_20250921`) into your Flutter project under `assets/www/` or similar. The structure should look like:

   ```
   my_flutter_app/
     assets/
       www/
         index.html
         style.css
         app.js
         Configs/
           env.json
         assets/
           images/
             wolf.jpg
   ```

2. **Update `pubspec.yaml`**

   Make sure Flutter knows about these assets. Add (or update) the following section in your `pubspec.yaml`:

   ```yaml
   flutter:
     assets:
       - assets/www/
       - assets/www/Configs/
       - assets/www/assets/images/
   ```

   You can collapse the paths if you prefer (`- assets/www/` will include all sub‑directories), but listing them explicitly ensures everything is packaged.

3. **Load in `WKWebView`**

   In your Dart code, load the HTML file using the `file://` or `flutter-asset://` scheme. For example:

   ```dart
   final controller = WebViewController()
     ..setJavaScriptMode(JavaScriptMode.unrestricted)
     ..loadFlutterAsset('assets/www/index.html');
   ```

   Ensure that your `WKWebView` configuration allows unrestricted JavaScript execution, as the app relies on local JS.

## Known WKWebView Caveats

* **No service worker** – Because this build must run offline from local files, no service worker is registered. If you previously had one, it will be unregistered on first load.
* **Relative paths & `<base>` tag** – All scripts, styles and assets are referenced relatively. The `<base href="./">` in `index.html` ensures that links resolve correctly when loaded via `file://` or `flutter-asset://`.
* **PDF download** – The “Download PDF” button generates a PDF on the fly using a minimal PDF generator implemented in JavaScript. It triggers a file download via a Blob URL. WKWebView blocks `window.open`, so this build avoids it. The generated PDF summarises the orders created during the session.
* **File picker** – The catalogue upload in the Shop Owner portal uses a standard `<input type="file">` element. WKWebView will present the native file picker. Camera support is not required; a future native bridge can be added.

## Assets

The `assets/images/wolf.jpg` file provides the default background. It lives under `assets/images/` and is referenced by the CSS. If you replace this image, preserve the filename and relative path so that the site continues to render correctly.

## Build contents

* **index.html** – entry point with a `<base>` tag, navigation, page containers and script references.
* **style.css** – basic styles for navigation, pages, RTL support and the canary badge.
* **app.js** – loads configuration from `Configs/env.json`, sets up translations (English/Arabic), handles navigation, pricing logic (one‑year free period, loyalty discount, commission calculation), mock order creation, shop owner catalogue upload and PDF generation.
* **Configs/env.json** – environment and pricing flags. Adjust `billingStartAt` or other values here without modifying code.
* **assets/images/wolf.jpg** – placeholder background image (replace with your own if desired).
* **README.md** – this file.
* **CHANGELOG.md** – high‑level list of changes since the previous build.

## Adding or modifying features

The JavaScript in `app.js` is intentionally modular and reads values from `Configs/env.json`. To change pricing, free‑period dates, commission or feature toggles, edit `env.json` and reload the page. To adjust translations or UI copy, update the `translations` object in `app.js`.

Should you need to add more complex data storage (e.g. catalogue persistence or real order tracking), integrate with a serverless backend via XHR/fetch; however, be mindful that network calls will fail when running purely offline in a WKWebView.