// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getPageContent") {
    try {
      // Attempt to extract meaningful text content from the page
      // This is a simple approach; more sophisticated methods exist
      let content = '';
      const mainContentSelectors = ['article', 'main', 'div[role="main"]', 'div.post-content', 'div.entry-content'];
      let mainEl = null;
      for (let selector of mainContentSelectors) {
        mainEl = document.querySelector(selector);
        if (mainEl) break;
      }

      if (!mainEl) {
        // Fallback to body if no main content element is found
        mainEl = document.body;
      }

      // Extract text from paragraphs and headings within the main element
      const textElements = mainEl.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
      textElements.forEach(el => {
        content += el.innerText + '\n';
      });

      if (content.trim() === '') {
        // If no specific text found, fallback to all body text (less accurate)
        content = document.body.innerText;
      }

      if (content && content.trim().length > 0) {
        sendResponse({ data: content.trim() });
      } else {
        sendResponse({ error: "Could not extract text content from the page." });
      }
    } catch (e) {
      sendResponse({ error: "Error extracting content: " + e.message });
    }
    return true; // Indicate that the response is sent asynchronously
  }
});
