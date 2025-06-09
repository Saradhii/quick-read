// IMPORTANT: REPLACE 'YOUR_API_KEY' WITH YOUR ACTUAL GEMINI API KEY
const GEMINI_API_KEY = 'YOUR_API_KEY_GOES_HERE'; // Or your actual key if already set by user
const GEMINI_API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'; // Base URL

async function summarizeWithGemini(text, lengthPreference = 'short') { // Added lengthPreference
  const apiKey = GEMINI_API_KEY; // Use a local const for clarity within function
  if (!apiKey || apiKey === 'YOUR_API_KEY_GOES_HERE') {
    return { error: "API Key not provided. Please add it to background.js" };
  }

  if (!text || text.trim().length === 0) {
    return { summary: ["No content provided to summarize."] };
  }

  const maxInputLength = 15000;
  if (text.length > maxInputLength) {
    text = text.substring(0, maxInputLength);
  }

  let promptSummaryLength = "approximately 2-3 concise bullet points"; // Default to short
  if (lengthPreference === 'medium') {
    promptSummaryLength = "approximately 4-5 concise bullet points";
  }

  const prompt = `Summarize the following web page content into ${promptSummaryLength}. Focus on the main topics and key takeaways:

${text}`;
  const fullApiUrl = `${GEMINI_API_URL_BASE}?key=${apiKey}`;


  try {
    const response = await fetch(fullApiUrl, { // Use fullApiUrl
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }] // Use the dynamically constructed prompt
        }],
      }),
    });
    // ... (rest of the try block remains largely the same, handling response and errors)
    // ... make sure any console.error or error messages are clear
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: { message: "Could not parse error JSON."} })); // Catch if errorBody itself is not JSON
      console.error('Gemini API Error:', errorBody);
      return { error: `Gemini API request failed: ${response.status} ${response.statusText}. Details: ${errorBody?.error?.message || 'No specific error message.'}` };
    }

    const data = await response.json();

    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
      const summaryText = data.candidates[0].content.parts[0].text;
      let summaryPoints = summaryText.split(/\n\s*[-*•–—]\s+|\n\s*\d+\.\s+/).filter(pt => pt.trim().length > 0);
      if (summaryPoints.length === 1 && summaryText.includes('\n')) {
          summaryPoints = summaryText.split('\n').filter(pt => pt.trim().length > 0);
      }
      if (summaryPoints.length === 0 && summaryText.length > 0) {
          summaryPoints = [summaryText];
      }
      return { summary: summaryPoints.map(pt => pt.trim()) };
    } else {
      console.error('Gemini API: No content in response', data);
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
          summarizeWithGemini(contentResponse.data, request.lengthPreference).then(summaryResult => { // Pass lengthPreference
            sendResponse(summaryResult);
          }).catch(error => {
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
