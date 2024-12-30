document.addEventListener("DOMContentLoaded", async () => {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const showBtn = document.getElementById("showBtn");

  const apiKeyInput = document.getElementById("apiKeyInput");
  const toggleKeyBtn = document.getElementById("toggleKeyBtn");
  const saveKeyBtn = document.getElementById("saveKeyBtn");

  const screenshotImg = document.getElementById("screenshotImg");

  // Retrieve any saved API key to pre-fill the text box
  chrome.storage.sync.get("gpt4oApiKey", (data) => {
    if (data.gpt4oApiKey) {
      apiKeyInput.value = data.gpt4oApiKey;
    }
  });

  // Show / Hide the API key
  toggleKeyBtn.addEventListener("click", () => {
    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      toggleKeyBtn.innerHTML = '<i class="bi bi-eye-slash"></i>';
      toggleKeyBtn.setAttribute("aria-label", "Hide API Key");
    } else {
      apiKeyInput.type = "password";
      toggleKeyBtn.innerHTML = '<i class="bi bi-eye"></i>';
      toggleKeyBtn.setAttribute("aria-label", "Show API Key");
    }
  });

  // Save the key in Chrome Storage
  saveKeyBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      chrome.storage.sync.set({ gpt4oApiKey: key }, () => {
        console.log("GPT-4o API key saved.");
        alert("API key saved successfully!");
      });
    } else {
      alert("Please enter a valid API key.");
    }
  });

  // Start capturing (tells the content script to set up the interval)
  startBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: "start-capturing" });
    startBtn.classList.add("disabled");
    stopBtn.classList.remove("disabled");
  });

  // Stop capturing
  stopBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: "stop-capturing" });
    startBtn.classList.remove("disabled");
    stopBtn.classList.add("disabled");
  });

  // Show the latest screenshot (on demand)
  showBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "get-latest-screenshot" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error retrieving screenshot:", chrome.runtime.lastError);
        alert("Error retrieving the screenshot.");
        return;
      }
      if (response && response.scaledDataUrl) {
        screenshotImg.src = response.scaledDataUrl;
        screenshotImg.style.display = "block";
      } else {
        alert("No screenshot available.");
        screenshotImg.src = "";
        screenshotImg.style.display = "none";
      }
    });
  });

  // Hide "Show Latest Screenshot" if not in debug mode
  const DEBUG_MODE = false; // set to true for debug
  if (DEBUG_MODE) {
    showBtn.style.display = "none";
    screenshotImg.style.display = "none";
    startBtn.style.display = "none";
    stopBtn.style.display = "none";
  }
});

// Retrieve blocked minutes and display in popup
chrome.storage.sync.get("blockedMinutes", (data) => {
  const minutesBlocked = document.getElementById("minutesBlocked");
  if (data.blockedMinutes) {
    minutesBlocked.textContent = data.blockedMinutes;
  }
});