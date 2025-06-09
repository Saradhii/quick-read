chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "summarizePage") {
    if (!request.tabId) {
      sendResponse({ error: "No tab ID provided." });
      return true; // Indicates that the response will be sent asynchronously
    }

    // Inject the content script into the specified tab
    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      files: ['content_script.js']
    }, (injectionResults) => {
      if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) {
        // If injection failed, send an error response
        sendResponse({ error: "Failed to inject content script. " + (chrome.runtime.lastError ? chrome.runtime.lastError.message : "No results returned.") });
        return; // Keep 'return true' if you were to use sendResponse asynchronously elsewhere, but here it's direct.
      }
      // After successful injection, send a message to the content script to get the page content
      chrome.tabs.sendMessage(request.tabId, { action: "getPageContent" }, function(contentResponse) {
        if (chrome.runtime.lastError) {
          sendResponse({ error: "Error getting content from page: " + chrome.runtime.lastError.message });
          return;
        }
        if (contentResponse && contentResponse.data) {
          const text = contentResponse.data;
          if (!text || text.trim() === "") {
            sendResponse({ summary: ["No text content found on the page."] });
            return;
          }

          // 1. Split into sentences
          let sentences = text.match(/[^.!?]+[.!?\n]+/g) || [];

          // 2. Clean and filter sentences
          sentences = sentences.map(s => s.trim()).filter(s => s.length > 10 && s.length < 300); // Filter very short/long sentences

          if (sentences.length === 0) {
            sendResponse({ summary: ["Not enough content to summarize."] });
            return;
          }

          // 3. Basic Ranking (for this version, we'll just take the first few suitable sentences)
          // More advanced ranking could involve keyword frequency, TF-IDF, etc.
          const numberOfPoints = 3; // Desired number of bullet points
          let summaryPoints = [];

          // Attempt to get a mix of sentences from the beginning and potentially middle.
          if (sentences.length <= numberOfPoints) {
            summaryPoints = sentences;
          } else {
            summaryPoints.push(sentences[0]); // Always take the first sentence
            if (sentences.length > 1) summaryPoints.push(sentences[1]); // And the second if available

            // Add one more from a bit later if available and distinct
            if (sentences.length > numberOfPoints && sentences.length > 2) {
                 let midSentenceIndex = Math.floor(sentences.length / 2);
                 if (midSentenceIndex > 1 && midSentenceIndex < sentences.length) { // ensure it's not one of the first two
                    if (!summaryPoints.includes(sentences[midSentenceIndex])) {
                        summaryPoints.push(sentences[midSentenceIndex]);
                    }
                 }
            }
            // Fill up to numberOfPoints if we still don't have enough
            let currentSentenceIndex = 2;
            while(summaryPoints.length < numberOfPoints && currentSentenceIndex < sentences.length){
                if(!summaryPoints.includes(sentences[currentSentenceIndex])){
                    summaryPoints.push(sentences[currentSentenceIndex]);
                }
                currentSentenceIndex++;
            }
          }

          // Ensure unique points
          summaryPoints = [...new Set(summaryPoints)];


          if (summaryPoints.length > 0) {
            sendResponse({ summary: summaryPoints });
          } else {
            sendResponse({ summary: ["Could not generate a summary from the content."] });
          }
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
