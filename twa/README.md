# WATCHMORE TWA / PWABuilder configuration

## Why the URL bar can appear

A Trusted Web Activity removes the browser URL bar only when Android verifies the app-to-website association through **Digital Asset Links**. If verification fails, Android can fall back to a browser/custom-tab presentation, which can show the site URL.

This project is prepared for that flow, but the final `assetlinks.json` values depend on the Android package generated/signed by PWABuilder. They cannot be safely guessed in the website ZIP.

## Final setup after PWABuilder generates the Android package

1. In PWABuilder, use the deployed HTTPS WATCHMORE URL.
2. Generate the Android/TWA package.
3. Note the Android **package name/application ID** and the **SHA-256 certificate fingerprint** for the certificate used to sign the APK/AAB.
4. Edit the root `.well-known/assetlinks.json` in this website and replace:
   - `REPLACE_WITH_YOUR_ANDROID_PACKAGE_NAME`
   - `REPLACE_WITH_YOUR_SHA256_SIGNING_CERTIFICATE_FINGERPRINT`
5. Deploy the updated website so this exact URL works:
   `https://YOUR-DOMAIN/.well-known/assetlinks.json`
6. Reinstall the APK/AAB after the website is updated.
7. Test on Android. The WATCHMORE app should open as a verified TWA without the browser URL bar.

## Important

Use the SHA-256 fingerprint of the certificate that actually signs the installed build. If you use Google Play App Signing, the production Play certificate fingerprint can differ from the local/upload certificate.

The web manifest has been hardened for TWA use with `display: standalone`, a stable `id`, and launch handling. These settings alone cannot replace Digital Asset Links verification.
