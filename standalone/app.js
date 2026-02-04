const apiKeyInput = document.getElementById("apiKey");
const bleedSizeInput = document.getElementById("bleedSize");
const promptInput = document.getElementById("prompt");
const imageInput = document.getElementById("imageInput");
const generateButton = document.getElementById("generateButton");
const statusEl = document.getElementById("status");
const originalPreview = document.getElementById("originalPreview");
const generatedPreview = document.getElementById("generatedPreview");
const downloadLink = document.getElementById("downloadLink");

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

const handleGenerate = async () => {
  const apiKey = apiKeyInput.value.trim();
  const bleed = Number.parseInt(bleedSizeInput.value, 10);
  const promptHint = promptInput.value.trim();
  const file = imageInput.files?.[0];

  if (!apiKey) {
    setStatus("Enter your Gemini API key.");
    return;
  }

  if (!file) {
    setStatus("Upload an image to extend.");
    return;
  }

  if (!Number.isFinite(bleed) || bleed <= 0) {
    setStatus("Enter a valid bleed size.");
    return;
  }

  generateButton.disabled = true;
  setStatus("Sending image to Gemini...");

  try {
    const dataUrl = await readFileAsDataUrl(file);
    originalPreview.src = dataUrl;

    const [header, base64] = dataUrl.split(",");
    const mimeMatch = /data:(.*?);base64/.exec(header);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    const prompt = `${promptHint || "Extend the image beyond its edges."} Provide an expanded canvas with ${bleed}px bleed on all sides.`;

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
    originalPreview.removeAttribute("src");
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  originalPreview.src = dataUrl;
});

generateButton.addEventListener("click", handleGenerate);
