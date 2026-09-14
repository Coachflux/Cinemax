# WATCHMORE — PWABuilder-ready build

WATCHMORE is a responsive movie/TV discovery PWA with watchlist, search, TV browsing, and an AI feature area.

## Deploy to GitHub Pages

1. Upload the contents of this folder to your repository.
2. Make sure `index.html` is at the published site root.
3. Enable GitHub Pages for the branch/folder you use.
4. Open the HTTPS GitHub Pages URL and verify the PWA install prompt.

## Build with PWABuilder

Use the **HTTPS URL of the deployed WATCHMORE site** in PWABuilder. The project includes:

- `manifest.json`
- `sw.js`
- PNG icons at 48/96/144/180/192/384/512 sizes
- install metadata
- responsive mobile UI
- service-worker caching and offline navigation fallback

## Important production notes

- Replace the sample/client-side TMDB key in `utils.js` with your own TMDB API key and follow TMDB's terms.
- Firebase authentication is optional and requires replacing the placeholder Firebase configuration with your own project values.
- Third-party video/embed services should only be used where you have the necessary rights or permission to provide the content.
- Configure advertising only through a network account that approves your content and deployment.
