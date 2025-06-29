// IMPORTANT: REPLACE 'YOUR_API_KEY' WITH YOUR ACTUAL GEMINI API KEY
const GEMINI_API_KEY = 'AIzaSyAvn9kp9Ht7Hp6vL0q3hiH15qxOuIXK2eg'; // Or your actual key if already set by user
const GEMINI_API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// Updated function signature to accept pageDetails object
async function summarizeWithGemini(pageDetails, lengthPreference = 'short') {
  const apiKey = GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_API_KEY_GOES_HERE') {
    return { error: "API Key not provided. Please add it to background.js" };
  }

  const { articleText, pageTitle, siteName, pageDescription } = pageDetails;

  if (!articleText || articleText.trim().length === 0) {
    return { summary: "No content provided to summarize." }; // Return as plain text, popup will handle if it's an error
  }

  // Truncate articleText if it's too long to avoid exceeding API limits
  // Combined length of context and article text should be considered.
  // Let's be very conservative with articleText length for now.
  const maxArticleLength = 12000; // Characters for article text
  let truncatedArticleText = articleText;
  if (articleText.length > maxArticleLength) {
    truncatedArticleText = articleText.substring(0, maxArticleLength) + "... (truncated)";
  }

  let promptSummaryLengthDetails = "a concise summary with 2-3 main points";
  if (lengthPreference === 'medium') {
    promptSummaryLengthDetails = "a slightly more detailed summary with 4-5 main points";
  }

  // Constructing a more contextual prompt
  let prompt = `Given the following context about a web page:
Site Name: ${siteName || 'Not available'}
Page Title: ${pageTitle || 'Not available'}
Page Description: ${pageDescription || 'Not available (if any)'}

Please summarize the main content of the page, provided below, into ${promptSummaryLengthDetails}.
Format the summary using Markdown (e.g., headings, bold text for emphasis, lists).
Ensure the output is only the Markdown summary.

Web Page Content:
---
${truncatedArticleText}
---
`;

  const fullApiUrl = `${GEMINI_API_URL_BASE}?key=${apiKey}`;

  try {
    const response = await fetch(fullApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Consider generationConfig for more control if needed, e.g. candidate_count: 1
        generationConfig: {
          // temperature: 0.7, // Example
          // candidateCount: 1 // Often good to set to 1 for direct summarization
        }
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: { message: "Could not parse error JSON."} }));
      console.error('Gemini API Error:', errorBody);
      // Send back the raw error message, popup.js will display it.
      return { error: `Gemini API request failed: ${response.status} ${response.statusText}. ${errorBody?.error?.message || 'Details unavailable.'}` };
    }

    const data = await response.json();

    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
      const summaryMarkdown = data.candidates[0].content.parts[0].text;
      // The response is now expected to be Markdown.
      // No need to split into bullet points here; popup.js will render the Markdown.
      return { summary: summaryMarkdown.trim() }; // Send as a single Markdown string
    } else {
      console.error('Gemini API: No content in response', data);
      if (data.promptFeedback && data.promptFeedback.blockReason) {
         return { error: `Content blocked by Gemini API: ${data.promptFeedback.blockReason}. ${data.promptFeedback.safetyRatings ? JSON.stringify(data.promptFeedback.safetyRatings) : ''}` };
      }
      return { error: "Could not extract summary from Gemini API response. The response might be empty or malformed." };
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

    // Updated files array for executeScript
    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      files: ['lib/Readability.js', 'content_script.js'] // Ensure Readability.js is injected first
    }, (injectionResults) => {
      if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) {
        sendResponse({ error: "Failed to inject content script(s). " + (chrome.runtime.lastError ? chrome.runtime.lastError.message : "No results returned.") });
        return;
      }

      // Message to content script is the same
      chrome.tabs.sendMessage(request.tabId, { action: "getPageContent" }, function(contentResponse) {
        if (chrome.runtime.lastError) {
          sendResponse({ error: "Error getting content from page: " + chrome.runtime.lastError.message });
          return;
        }

        // contentResponse is now an object: { articleText, pageTitle, siteName, pageDescription } or { error }
        if (contentResponse && contentResponse.articleText) {
          // Pass the whole contentResponse object (which is pageDetails) and lengthPreference
          summarizeWithGemini(contentResponse, request.lengthPreference).then(summaryResult => {
            sendResponse(summaryResult);
          }).catch(error => {
            sendResponse({ error: `Unexpected error during summarization: ${error.message}` });
          });
        } else if (contentResponse && contentResponse.error) {
          sendResponse({ error: contentResponse.error }); // Forward error from content_script
        } else {
          sendResponse({ error: "No valid content or data received from content script." });
        }
      });
    });
    return true; // Indicates that the response will be sent asynchronously
  }
});
