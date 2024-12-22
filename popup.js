document.addEventListener("DOMContentLoaded", async () => {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const showBtn = document.getElementById("showBtn");

  const apiKeyInput = document.getElementById("apiKeyInput");
  const toggleKeyBtn = document.getElementById("toggleKeyBtn");
  const saveKeyBtn = document.getElementById("saveKeyBtn");

  const screenshotImg = document.getElementById("screenshotImg");

  // Disable Stop button initially
  // stopBtn.disabled = true;

  // 1) Retrieve any saved API key to pre-fill the text box
  chrome.storage.sync.get("gpt4oApiKey", (data) => {
    if (data.gpt4oApiKey) {
      apiKeyInput.value = data.gpt4oApiKey;
    }
  });

  // 2) Show / Hide the API key
  toggleKeyBtn.addEventListener("click", () => {
    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      toggleKeyBtn.textContent = "Hide Key";
    } else {
      apiKeyInput.type = "password";
      toggleKeyBtn.textContent = "Show Key";
    }
  });

  // 3) Save the key in Chrome Storage
  saveKeyBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    chrome.storage.sync.set({ gpt4oApiKey: key }, () => {
      console.log("GPT-4o API key saved.");
      alert("API key saved successfully!");
    });
  });

  // 4) Start capturing (tells the content script to set up the interval)
  startBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: "start-capturing" });
    // startBtn.disabled = true;
    // stopBtn.disabled = false;
  });

  // 5) Stop capturing
  stopBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: "stop-capturing" });
    // startBtn.disabled = false;
    // stopBtn.disabled = true;
  });

  // 6) Show the latest screenshot (on demand)
  showBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "get-latest-screenshot" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error retrieving screenshot:", chrome.runtime.lastError);
        return;
      }
      if (response && response.scaledDataUrl) {
        screenshotImg.src = response.scaledDataUrl;
        screenshotImg.style.display = "block";
      } else {
        screenshotImg.src = "";
        screenshotImg.style.display = "none";
      }
    });
  });
});
