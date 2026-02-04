import { app, core, imaging } from "photoshop";

const statusEl = document.getElementById("status");
const runButton = document.getElementById("runBleed");

const setStatus = (message) => {
  statusEl.textContent = message;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const reflect = (value, max) => {
  if (value < 0) {
    return -value - 1;
  }
  if (value > max) {
    return max - (value - max) + 1;
  }
  return value;
};

const createBleedPixels = ({
  originalData,
  width,
  height,
  bleed,
  mode,
  targetWidth,
  targetHeight,
}) => {
  const result = new Uint8ClampedArray(targetWidth * targetHeight * 4);

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const srcX = x - bleed;
      const srcY = y - bleed;

      let sourceX = srcX;
      let sourceY = srcY;

      if (srcX < 0 || srcX >= width || srcY < 0 || srcY >= height) {
        if (mode === "mirror") {
          sourceX = reflect(srcX, width - 1);
          sourceY = reflect(srcY, height - 1);
        } else {
          sourceX = clamp(srcX, 0, width - 1);
          sourceY = clamp(srcY, 0, height - 1);
        }
      }

      const srcIndex = (sourceY * width + sourceX) * 4;
      const destIndex = (y * targetWidth + x) * 4;

      result[destIndex] = originalData[srcIndex];
      result[destIndex + 1] = originalData[srcIndex + 1];
      result[destIndex + 2] = originalData[srcIndex + 2];
      result[destIndex + 3] = originalData[srcIndex + 3];
    }
  }

  return result;
};

const decodeBase64ToUint8 = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const fetchGeminiBleed = async ({ apiKey, prompt, imageBase64, mimeType }) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          responseMimeType: "image/png",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }

  const payload = await response.json();
  const part = payload.candidates?.[0]?.content?.parts?.find(
    (item) => item.inlineData?.data
  );

  return part?.inlineData?.data ?? null;
};

const applyGeminiBleed = async ({ doc, bleed, apiKey, prompt }) => {
  const width = doc.width.as("px");
  const height = doc.height.as("px");

  const pixelResponse = await imaging.getPixels({
    documentID: doc.id,
    rect: { left: 0, top: 0, right: width, bottom: height },
    colorSpace: "RGB",
    componentSize: 8,
  });

  const base64 = btoa(String.fromCharCode(...pixelResponse.imageData.data));

  const geminiPrompt = `${prompt || "Extend the image beyond its edges."} Provide an expanded canvas with ${bleed}px bleed on all sides.`;

  const generatedBase64 = await fetchGeminiBleed({
    apiKey,
    prompt: geminiPrompt,
    imageBase64: base64,
    mimeType: "image/png",
  });

  if (!generatedBase64) {
    throw new Error("Gemini did not return image data.");
  }

  const imageBytes = decodeBase64ToUint8(generatedBase64);
  const decoded = await imaging.decodeImage({
    imageData: imageBytes,
  });

  await doc.resizeCanvas(width + bleed * 2, height + bleed * 2, "MIDDLECENTER");

  await imaging.putPixels({
    documentID: doc.id,
    layerID: doc.activeLayers[0].id,
    imageData: decoded.imageData,
    rect: {
      left: 0,
      top: 0,
      right: decoded.width,
      bottom: decoded.height,
    },
  });
};

const applyLocalBleed = async ({ doc, bleed, mode }) => {
  const width = doc.width.as("px");
  const height = doc.height.as("px");

  const pixelResponse = await imaging.getPixels({
    documentID: doc.id,
    rect: { left: 0, top: 0, right: width, bottom: height },
    colorSpace: "RGBA",
    componentSize: 8,
  });

  const targetWidth = width + bleed * 2;
  const targetHeight = height + bleed * 2;

  const newPixels = createBleedPixels({
    originalData: pixelResponse.imageData.data,
    width,
    height,
    bleed,
    mode,
    targetWidth,
    targetHeight,
  });

  await doc.resizeCanvas(targetWidth, targetHeight, "MIDDLECENTER");

  await imaging.putPixels({
    documentID: doc.id,
    layerID: doc.activeLayers[0].id,
    imageData: {
      data: newPixels,
      width: targetWidth,
      height: targetHeight,
    },
    rect: {
      left: 0,
      top: 0,
      right: targetWidth,
      bottom: targetHeight,
    },
  });
};

const runBleed = async () => {
  const apiKey = document.getElementById("apiKey").value.trim();
  const bleed = Number.parseInt(document.getElementById("bleedSize").value, 10);
  const mode = document.getElementById("mode").value;
  const prompt = document.getElementById("prompt").value.trim();

  if (!app.activeDocument) {
    setStatus("Open a document to generate bleed.");
    return;
  }

  if (!Number.isFinite(bleed) || bleed <= 0) {
    setStatus("Enter a valid bleed size.");
    return;
  }

  runButton.disabled = true;
  setStatus("Processing bleed...");

  try {
    await core.executeAsModal(async () => {
      const doc = app.activeDocument;
      if (mode === "ai") {
        if (!apiKey) {
          throw new Error("Gemini API key is required for AI mode.");
        }
        await applyGeminiBleed({ doc, bleed, apiKey, prompt });
      } else {
        await applyLocalBleed({ doc, bleed, mode });
      }
    }, { commandName: "Generative Bleed" });

    setStatus("Bleed completed.");
  } catch (error) {
    console.error(error);
    setStatus(`Bleed failed: ${error.message}`);
  } finally {
    runButton.disabled = false;
  }
};

runButton.addEventListener("click", runBleed);
