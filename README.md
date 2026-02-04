# PressDrop Generative Bleed

A Photoshop UXP panel that extends artwork beyond the canvas edge using Gemini AI (banana nano, free tier) or fast local modes like mirror and smear.

## Features

- **Gemini AI (banana nano)**: Sends the image to Gemini 1.5 Flash 8B and requests a larger canvas with generated bleed.
- **Mirror edge**: Reflects the edge pixels outward.
- **Smear colors**: Clamps edge pixels outward to create a soft smear.

## Setup

1. Load the plugin folder in Photoshop (UXP developer tools).
2. Open the **Generative Bleed** panel.
3. Enter your Gemini API key (free tier) and choose a mode.
4. Click **Generate bleed**.

## Notes

- Gemini AI uses the `gemini-1.5-flash-8b` model for low-cost, free-tier-friendly generations.
- For AI mode, keep images reasonably sized for faster requests.
- Local mirror/smear modes operate directly on pixels in the active document.

## Folder structure

```
manifest.json
index.html
src/
  main.js
  styles.css
```
