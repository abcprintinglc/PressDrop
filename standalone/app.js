const apiKeyInput = document.getElementById("apiKey");
const bleedSizeInput = document.getElementById("bleedSize");
const imageInput = document.getElementById("imageInput");
const imageNameInput = document.getElementById("imageName");
const browseButton = document.getElementById("browseButton");
const generateButton = document.getElementById("generateButton");
const bleedModeSelect = document.getElementById("bleedMode");
const statusEl = document.getElementById("status");
const originalPreview = document.getElementById("originalPreview");
const generatedPreview = document.getElementById("generatedPreview");
const downloadLink = document.getElementById("downloadLink");
const storedKey = "pressdrop.gemini.apiKey";

const setStatus = (message) => {
  statusEl.textContent = message;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const fetchGeminiBleed = async ({ apiKey, prompt, imageBase64, mimeType }) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

const handleGenerate = async () => {
  const apiKey = apiKeyInput.value.trim();
  const bleed = Number.parseInt(bleedSizeInput.value, 10);
  const mode = bleedModeSelect.value;
  const file = imageInput.files?.[0];

  if (!apiKey) {
    setStatus("Enter your Gemini API key.");
    return;
  }

  if (mode !== "ai") {
    setStatus("Mirror and smear modes are not available in the standalone app yet.");
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
  setStatus("Sending image to Gemini...");

  try {
    localStorage.setItem(storedKey, apiKey);
    const dataUrl = await readFileAsDataUrl(file);
    originalPreview.src = dataUrl;

    const [header, base64] = dataUrl.split(",");
    const mimeMatch = /data:(.*?);base64/.exec(header);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    const prompt = `Extend the image beyond its edges. Provide an expanded canvas with ${bleed}px bleed on all sides.`;

    const generatedBase64 = await fetchGeminiBleed({
      apiKey,
      prompt,
      imageBase64: base64,
      mimeType,
    });

    if (!generatedBase64) {
      throw new Error("Gemini did not return image data.");
    }

    const outputDataUrl = `data:image/png;base64,${generatedBase64}`;
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
});
