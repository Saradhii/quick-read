// IMPORTANT: REPLACE 'YOUR_API_KEY' WITH YOUR ACTUAL GEMINI API KEY
const GEMINI_API_KEY = 'YOUR_API_KEY_GOES_HERE';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

async function summarizeWithGemini(text) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_API_KEY_GOES_HERE') {
    return { error: "API Key not provided. Please add it to background.js" };
  }

  if (!text || text.trim().length === 0) {
    return { summary: ["No content provided to summarize."] };
  }

  // Truncate text if it's too long to avoid exceeding API limits (adjust as needed)
  const maxInputLength = 15000; // Characters, conservative limit
  if (text.length > maxInputLength) {
    text = text.substring(0, maxInputLength);
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Summarize the following web page content into approximately 3-5 concise bullet points. Focus on the main topics and key takeaways:

${text}`
          }]
        }],
        // Optional: Add generationConfig if needed for more control
        // generationConfig: {
        //   temperature: 0.7,
        //   topK: 1,
        //   topP: 1,
        //   maxOutputTokens: 256,
        // }
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Gemini API Error:', errorBody);
      return { error: `Gemini API request failed: ${response.status} ${response.statusText}. Details: ${errorBody?.error?.message || 'No specific error message.'}` };
    }

    const data = await response.json();

    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
      const summaryText = data.candidates[0].content.parts[0].text;
      // The API might return a single block of text; split into bullet points if needed.
      // This simple split assumes bullet points start with common markers.
      // You might need to adjust this based on Gemini's typical output format for such prompts.
      let summaryPoints = summaryText.split(/\n\s*[-*•–—]\s+|\n\s*\d+\.\s+/).filter(pt => pt.trim().length > 0);
      if (summaryPoints.length === 1 && summaryText.includes('\n')) { // If no list markers but newlines exist
          summaryPoints = summaryText.split('\n').filter(pt => pt.trim().length > 0);
      }
      if (summaryPoints.length === 0 && summaryText.length > 0) { // If it's just a single block of text
          summaryPoints = [summaryText];
      }


      return { summary: summaryPoints.map(pt => pt.trim()) };
    } else {
      console.error('Gemini API: No content in response', data);
      // Check for promptFeedback if content is missing (e.g. safety blocks)
      if (data.promptFeedback && data.promptFeedback.blockReason) {
        return { error: `Content blocked by Gemini API due to: ${data.promptFeedback.blockReason}. ${data.promptFeedback.safetyRatings ? JSON.stringify(data.promptFeedback.safetyRatings) : ''}` };
      }
      return { error: "Could not extract summary from Gemini API response." };
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return { error: `Network or other error calling Gemini API: ${error.message}` };
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "summarizePage") {
    if (!request.tabId) {
      sendResponse({ error: "No tab ID provided." });
      return true;
    }

    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      files: ['content_script.js']
    }, (injectionResults) => {
      if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) {
        sendResponse({ error: "Failed to inject content script. " + (chrome.runtime.lastError ? chrome.runtime.lastError.message : "No results returned.") });
        return;
      }

      chrome.tabs.sendMessage(request.tabId, { action: "getPageContent" }, function(contentResponse) {
        if (chrome.runtime.lastError) {
          sendResponse({ error: "Error getting content from page: " + chrome.runtime.lastError.message });
          return;
        }
        if (contentResponse && contentResponse.data) {
          // Call Gemini summarization
          summarizeWithGemini(contentResponse.data).then(summaryResult => {
            sendResponse(summaryResult);
          }).catch(error => { // Should not happen if summarizeWithGemini always returns an object
            sendResponse({ error: `Unexpected error during summarization: ${error.message}` });
          });
        } else if (contentResponse && contentResponse.error) {
          sendResponse({ error: contentResponse.error });
        } else {
          sendResponse({ error: "No content received from content script." });
        }
      });
    });
    return true; // Indicates that the response will be sent asynchronously
  }
});
