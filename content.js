let capturingIntervalId = null;
let blockedMinutes = 0;
let isBlockingAd = false; // Tracks if we're actively blocking ads
let blockTimerId = null;
const CHECK_INTERVAL = 5_000; // Check every 5 seconds

// Initialize blocked minutes from storage
chrome.storage.sync.get("blockedMinutes", (data) => {
  if (data.blockedMinutes) {
    blockedMinutes = data.blockedMinutes;
  }
});

function startCapturing() {
  if (!capturingIntervalId) {
    capturingIntervalId = setInterval(() => {
      chrome.runtime.sendMessage({ action: "auto-capture" });
    }, CHECK_INTERVAL);
    console.log(`MinusAds: Started capturing every ${CHECK_INTERVAL} seconds.`);
  }
}

function stopCapturing() {
  if (capturingIntervalId) {
    clearInterval(capturingIntervalId);
    capturingIntervalId = null;
    console.log("MinusAds: Stopped capturing.");
  }
}

function startBlockedTimer() {
  if (!blockTimerId) {
    blockTimerId = setInterval(() => {
      blockedMinutes++;
      chrome.storage.sync.set({ blockedMinutes });
      console.log(`[MinusAds] Total blocked minutes: ${blockedMinutes}`);
    }, 60_000); // Increment every minute
  }
}

function stopBlockedTimer() {
  if (blockTimerId) {
    clearInterval(blockTimerId);
    blockTimerId = null;
  }
}

function addOverlay() {
  if (isBlockingAd) return; // Prevent duplicate overlays
  isBlockingAd = true;

  // Start tracking blocked minutes
  startBlockedTimer();

  // Step 1: Create the bottom overlay container
  let overlay = document.getElementById("minusads-overlay");
  if (!overlay) {
    console.log("MinusAds: Ad detected! Adding responsive, sleek bottom overlay.");
    overlay = document.createElement("div");
    overlay.id = "minusads-overlay";
    document.body.appendChild(overlay);
  }

  // Step 2: Style the overlay container
  overlay.style.position = "fixed";
  overlay.style.bottom = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  // overlay.style.backgroundColor = "#2A2E35"; // Sleek, professional dark background
  overlay.style.color = "#FFF";
  overlay.style.fontFamily = "'Roboto', sans-serif";
  overlay.style.zIndex = "9999";
  overlay.style.padding = "10px 20px";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.flexWrap = "wrap"; // Allows breaking on smaller screens

  // Step 3: Add content to the overlay
  overlay.innerHTML = `
  <img src="https://raw.githubusercontent.com/nuwandavek/minusads/refs/heads/master/assets/santa3.gif"
    alt="Ad Image" 
    >
    <div style="flex: 1; min-width: 200px; font-size: 16px;">
      <strong style="color: #00A8E8;">Ad Detected:</strong> Muted for your convenience.
    </div>
  `;

  // Step 4: Add event listener to dismiss the overlay
  // const closeButton = overlay.querySelector("#close-overlay");
  // closeButton.addEventListener("click", () => {
  //   removeOverlay();
  // });

  // Step 5: Auto-mute on ad detect
  const videoElements = document.querySelectorAll("video, audio");
  videoElements.forEach((element) => {
    element.dataset.previousVolume = element.volume || "0.5"; // Save current volume, default to 0.5
    element.volume = 0; // Mute
    element.muted = true;
  });
}

function removeOverlay() {
  const overlay = document.getElementById("minusads-overlay");
  if (overlay) {
    console.log("MinusAds: Removing bottom overlay.");
    overlay.remove();
  }

  // Stop tracking blocked minutes if no ads are detected
  stopBlockedTimer();
  isBlockingAd = false;

  // Step 6: Unmute on ad gone
  const videoElements = document.querySelectorAll("video, audio");
  videoElements.forEach((element) => {
    if (element.dataset.previousVolume !== undefined) {
      element.volume = parseFloat(element.dataset.previousVolume); // Restore volume
      element.muted = false;
      delete element.dataset.previousVolume;
    }
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SCREENSHOT_DATA") {
    const { scaledDataUrl, serverResult } = message;

    console.log("MinusAds: Screenshot data received.", serverResult);

    // Check if GPT-4o Vision detected an ad
    if (serverResult.is_ad === true) {
      addOverlay();
    } else {
      removeOverlay();
    }
  } else if (message.action === "start-capturing") {
    startCapturing();
  } else if (message.action === "stop-capturing") {
    stopCapturing();
  }
});