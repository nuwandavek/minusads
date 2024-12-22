let lastScreenshotDataUrl = "";

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

async function scaleDown(imageBitmap, n) {
  const newWidth = Math.floor(imageBitmap.width / n);
  const newHeight = Math.floor(imageBitmap.height / n);

  const offscreen = new OffscreenCanvas(newWidth, newHeight);
  const ctx = offscreen.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

  const scaledBlob = await offscreen.convertToBlob({ type: "image/png" });
  return blobToDataUrl(scaledBlob);
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "auto-capture") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.error("No active tab to capture.");
      return;
    }

    try {
      // step1. get the full screenshot
      const fullDataUrl = await chrome.tabs.captureVisibleTab();
      // step2. scale down the image
      const blob = await (await fetch(fullDataUrl)).blob();
      // step3. convert the blob to an ImageBitmap
      const imageBitmap = await createImageBitmap(blob);
      // step4. scale down the ImageBitmap
      const n = 4;
      const scaledDataUrl = await scaleDown(imageBitmap, n);

      lastScreenshotDataUrl = scaledDataUrl;

      chrome.storage.sync.get("gpt4oApiKey", async (data) => {
        const apiKey = data.gpt4oApiKey || "";

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
                            "url": scaledDataUrl,
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
          scaledDataUrl,
          serverResult: gptResult
        });
      });
    } catch (captureError) {
      console.error("Error capturing screenshot:", captureError);
    }
  }
  else if (message.action === "get-latest-screenshot") {
    // Popup wants the last captured screenshot for display
    sendResponse({ scaledDataUrl: lastScreenshotDataUrl });
  }
});
