const apiKeyInput = document.getElementById("apiKey");
const bleedSizeInput = document.getElementById("bleedSize");
const imageInput = document.getElementById("imageInput");
const imageNameInput = document.getElementById("imageName");
const browseButton = document.getElementById("browseButton");
const generateButton = document.getElementById("generateButton");
const bleedModeSelect = document.getElementById("bleedMode");
const geminiModelSelect = document.getElementById("geminiModel");
const statusEl = document.getElementById("status");
const originalPreview = document.getElementById("originalPreview");
const generatedPreview = document.getElementById("generatedPreview");
const downloadLink = document.getElementById("downloadLink");
const storedKey = "pressdrop.gemini.apiKey";
const storedModelKey = "pressdrop.gemini.model";

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

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImage = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

const fetchGeminiBleed = async ({
  apiKey,
  prompt,
  imageBase64,
  mimeType,
  model,
}) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
        },
      }),
    }
  );

  if (!response.ok) {
    let errorMessage = `Gemini request failed: ${response.status}`;
    try {
      const errorPayload = await response.json();
      if (errorPayload.error?.message) {
        errorMessage = `Gemini request failed: ${errorPayload.error.message}`;
        if (errorPayload.error.message.toLowerCase().includes("quota")) {
          errorMessage = `${errorMessage} Try switching to mirror/smear mode or pick a different Gemini model.`;
        }
      }
    } catch (error) {
      console.warn("Failed to parse Gemini error payload", error);
    }
    throw new Error(errorMessage);
  }

  const payload = await response.json();
  const part = payload.candidates?.[0]?.content?.parts?.find(
    (item) => item.inlineData?.data
  );

  return part?.inlineData?.data ?? null;
};

const generateLocalBleed = async ({ dataUrl, bleed, mode }) => {
  const image = await loadImage(dataUrl);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const targetWidth = width + bleed * 2;
  const targetHeight = height + bleed * 2;

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");
  sourceContext.drawImage(image, 0, 0);
  const sourceData = sourceContext.getImageData(0, 0, width, height);

  const newPixels = createBleedPixels({
    originalData: sourceData.data,
    width,
    height,
    bleed,
    mode,
    targetWidth,
    targetHeight,
  });

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;
  const outputContext = outputCanvas.getContext("2d");
  const outputImageData = new ImageData(newPixels, targetWidth, targetHeight);
  outputContext.putImageData(outputImageData, 0, 0);

  return outputCanvas.toDataURL("image/png");
};

const handleGenerate = async () => {
  const apiKey = apiKeyInput.value.trim();
  const bleed = Number.parseInt(bleedSizeInput.value, 10);
  const mode = bleedModeSelect.value;
  const model = geminiModelSelect.value;
  const file = imageInput.files?.[0];

  if (!apiKey) {
    setStatus("Enter your Gemini API key.");
    return;
  }

  if (!file) {
    setStatus("Upload an image to extend.");
    return;
  }

  if (file.type === "application/pdf") {
    setStatus("PDF input is not supported in the standalone app yet.");
    return;
  }

  if (!["image/png", "image/jpeg"].includes(file.type)) {
    setStatus("Only PNG or JPG images are supported.");
    return;
  }

  if (!Number.isFinite(bleed) || bleed <= 0) {
    setStatus("Enter a valid bleed size.");
    return;
  }

  generateButton.disabled = true;
  setStatus(mode === "ai" ? "Sending image to Gemini..." : "Generating local bleed...");

  try {
    localStorage.setItem(storedKey, apiKey);
    localStorage.setItem(storedModelKey, model);
    const dataUrl = await readFileAsDataUrl(file);
    originalPreview.src = dataUrl;

    const [header, base64] = dataUrl.split(",");
    const mimeMatch = /data:(.*?);base64/.exec(header);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    let outputDataUrl = "";

    if (mode === "ai") {
      const prompt = `Extend the image beyond its edges. Provide an expanded canvas with ${bleed}px bleed on all sides.`;

      const generatedBase64 = await fetchGeminiBleed({
        apiKey,
        prompt,
        imageBase64: base64,
        mimeType,
        model,
      });

      if (!generatedBase64) {
        throw new Error("Gemini did not return image data.");
      }

      outputDataUrl = `data:image/png;base64,${generatedBase64}`;
    } else {
      outputDataUrl = await generateLocalBleed({ dataUrl, bleed, mode });
    }

    generatedPreview.src = outputDataUrl;
    downloadLink.href = outputDataUrl;
    downloadLink.classList.add("visible");
    setStatus("Bleed generated successfully.");
  } catch (error) {
    console.error(error);
    setStatus(`Bleed failed: ${error.message}`);
  } finally {
    generateButton.disabled = false;
  }
};

imageInput.addEventListener("change", async () => {
  const file = imageInput.files?.[0];
  if (!file) {
    imageNameInput.value = "";
    originalPreview.removeAttribute("src");
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  imageNameInput.value = file.name;
  originalPreview.src = dataUrl;
});

browseButton.addEventListener("click", () => {
  imageInput.click();
});

generateButton.addEventListener("click", handleGenerate);

window.addEventListener("DOMContentLoaded", () => {
  const cachedKey = localStorage.getItem(storedKey);
  if (cachedKey) {
    apiKeyInput.value = cachedKey;
  }
  const cachedModel = localStorage.getItem(storedModelKey);
  if (cachedModel) {
    geminiModelSelect.value = cachedModel;
  }
});
