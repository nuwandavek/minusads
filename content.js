
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

function addOverlay() {
  console.log("MinusAds: Ad detected! Overlay displayed.");
  // Step 1: Create the overlay div
  let overlay = document.getElementById("minusads-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "minusads-overlay";
    document.body.appendChild(overlay);
  }

  // Step 2: Style the overlay
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  // overlay.style.alignItems = "center";
  overlay.style.zIndex = "9999";

  // Step 3: Replace overlay content with a replacement image
  const replacementImageUrl = "https://www.indy100.com/media-library/people-who-found-fame-through-a-meme.png?id=54837721";
  overlay.innerHTML = `
    <div style="position: relative;">
      <img src="${replacementImageUrl}" alt="Replacement Image" style="width:100%; height: 100%;" />
      <button id="close-overlay" style="position: absolute; top: 10px; right: 10px; background: red; color: white; border: none; padding: 5px 10px; cursor: pointer;">X</button>
    </div>
  `;

  // Optional: Close the overlay on click or button
  overlay.addEventListener("click", (e) => {
    if (e.target.id === "close-overlay" || e.target === overlay) {
      overlay.remove();
    }
  });
}

function removeOverlay() {
  console.log("MinusAds: No ad detected, removing overlay if it exists");
  let overlay = document.getElementById("minusads-overlay");
  if (overlay) {
    overlay.remove();
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

    // Check if GPT-4o Vision detected an ad
    if (serverResult.is_ad === true) {
      addOverlay();
    } else {
      removeOverlay();
    }
    

    // 2) Log the GPT-4o Vision result
    // console.log("[MinusAds] GPT-4o API response:", serverResult);
  }
  else if (message.action === "start-capturing") {
    startCapturing();
  }
  else if (message.action === "stop-capturing") {
    stopCapturing();
  }
});
