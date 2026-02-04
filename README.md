# PressDrop Generative Bleed

A Photoshop UXP panel that extends artwork beyond the canvas edge using Gemini AI (banana nano, free tier) or fast local modes like mirror and smear. It also includes a standalone web app for generating bleed without Photoshop.

## Features

- **Gemini AI (banana nano)**: Sends the image to Gemini 2.0 Flash and requests a larger canvas with generated bleed.
- **Mirror edge**: Reflects the edge pixels outward (UXP panel only).
- **Smear colors**: Clamps edge pixels outward to create a soft smear (UXP panel only).
- **Standalone web app**: Upload an image and download the extended bleed in your browser.

## Standalone app

1. Run `PressDrop_Run_Pro.bat` on Windows (requires Python 3.10+).
2. A browser window opens at `http://localhost:8000/standalone/index.html`.
3. Paste your Gemini API key (stored locally in the browser), upload a PNG/JPG, and generate the bleed.

## Photoshop UXP panel setup

1. Load the plugin folder in Photoshop (UXP developer tools).
2. Open the **Generative Bleed** panel.
3. Enter your Gemini API key (free tier) and choose a mode.
4. Click **Generate bleed**.

## Notes

- Gemini AI uses the `gemini-2.0-flash` model for low-cost, free-tier-friendly generations.
- For AI mode, keep images reasonably sized for faster requests.
- Local mirror/smear modes operate directly on pixels in the active document.

## Folder structure

```
manifest.json
index.html
src/
  main.js
  styles.css
standalone/
  index.html
  app.js
  styles.css
```
