// content.js

// Interval ID for automatic captures
let capturingIntervalId = null;

function startCapturing() {
  if (!capturingIntervalId) {
    capturingIntervalId = setInterval(() => {
      // Tell the background to capture
      chrome.runtime.sendMessage({ action: "auto-capture" });
    }, 2_000);
    console.log("MinusAds: Started capturing every 10 seconds.");
  }
}

function stopCapturing() {
  if (capturingIntervalId) {
    clearInterval(capturingIntervalId);
    capturingIntervalId = null;
    console.log("MinusAds: Stopped capturing.");
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SCREENSHOT_DATA") {
    // 1) Log the image dimensions
    const { imageDataUrl, serverResult } = message;
    const img = new Image();
    img.src = imageDataUrl;
    img.onload = () => {
      console.log(`[MinusAds] Captured image dimensions: ${img.width}x${img.height}`);
    };

    // 2) Log the GPT-4o Vision result
    console.log("[MinusAds] GPT-4o API response:", serverResult);
  }
  else if (message.action === "start-capturing") {
    startCapturing();
  }
  else if (message.action === "stop-capturing") {
    stopCapturing();
  }
});
