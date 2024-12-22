// background.js (service_worker in Manifest V3)

let lastScreenshotDataUrl = "";

// Fired whenever the content script or popup sends us a message
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "auto-capture") {
    // Step 1: Find the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.error("No active tab to capture.");
      return;
    }

    // Step 2: Capture the screenshot (Base64 data URL)
    try {
      const imageDataUrl = await chrome.tabs.captureVisibleTab();
      lastScreenshotDataUrl = imageDataUrl;

      // Retrieve the GPT-4o API key from storage
      chrome.storage.sync.get("gpt4oApiKey", async (data) => {
        const apiKey = data.gpt4oApiKey || ""; // empty if none saved

        // We always send the screenshot data to the content script for dimension logging
        // Then, if we have an API key, we also call GPT-4o Vision
        let gptResult = { error: "No API key provided" };

        if (apiKey) {
          try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                  "model": "gpt-4o-mini",
                  "messages": [
                    {
                      "role": "user",
                      "content": [
                        {
                          "type": "image_url",
                          "image_url": {
                            "url": imageDataUrl,
                            "detail": "low"
                          }
                        },
                        {
                          "type": "text",
                          "text": "I am trying to detect ads inside a video that's in a TV show. Is this specific screenshot an ad? Just respond with 'yes' or 'no'"
                        }
                      ]
                    }
                  ],
                  "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                      "name": "ad_response",
                      "strict": true,
                      "schema": {
                        "type": "object",
                        "properties": {
                          "is_ad": {
                            "type": "boolean",
                            "description": "Indicates whether the content is an advertisement."
                          }
                        },
                        "required": [
                          "is_ad"
                        ],
                        "additionalProperties": false
                      }
                    }
                  },
                  "temperature": 1,
                  "max_completion_tokens": 200,
                  "top_p": 1,
                  "frequency_penalty": 0,
                  "presence_penalty": 0
              })
            });

            const res = await response.json();
            gptResult = {
              is_ad: JSON.parse(res.choices[0].message.content),
              fullResponse: res
            }
          } catch (apiError) {
            gptResult = { error: String(apiError) };
            console.error("Error calling GPT-4o Vision API:", apiError);
          }
        }

        // Send everything back to content script so it can log in the console
        chrome.tabs.sendMessage(tab.id, {
          type: "SCREENSHOT_DATA",
          imageDataUrl,
          serverResult: gptResult
        });
      });
    } catch (captureError) {
      console.error("Error capturing screenshot:", captureError);
    }
  }
  else if (message.action === "get-latest-screenshot") {
    // Popup wants the last captured screenshot for display
    sendResponse({ imageDataUrl: lastScreenshotDataUrl });
  }
});
