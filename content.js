
const IS_AD_EVAL_INTERVAL = 5_000;
let capturingIntervalId = null;

function startCapturing() {
  if (!capturingIntervalId) {
    capturingIntervalId = setInterval(() => {
      chrome.runtime.sendMessage({ action: "auto-capture" });
    }, IS_AD_EVAL_INTERVAL);
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
    const { scaledDataUrl, serverResult } = message;
    const img = new Image();
    img.src = scaledDataUrl;
    img.onload = () => {
      console.log(`[MinusAds] Captured image dimensions: ${img.width}x${img.height}`);
    };

    console.log("[MinusAds] GPT-4o API response:", serverResult);
  }
  else if (message.action === "start-capturing") {
    startCapturing();
  }
  else if (message.action === "stop-capturing") {
    stopCapturing();
  }
});
