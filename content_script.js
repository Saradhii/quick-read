// content_script.js

// Ensure Readability is available (it should be if injected before this script)
if (typeof Readability === 'undefined') {
  // This is a fallback or error indicator.
  // Ideally, background.js ensures Readability.js is injected first.
  console.error("Readability.js not loaded before content_script.js");
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getPageContent") {
    try {
      // 1. Clone the document to avoid altering the original page
      const documentClone = document.cloneNode(true);
      const article = new Readability(documentClone).parse();

      let articleText = '';
      if (article && article.textContent) {
        articleText = article.textContent;
      } else {
        // Fallback if Readability fails to parse, though it's usually robust
        console.warn("Readability could not parse the article effectively, falling back to simple text extraction.");
        let content = '';
        const mainContentSelectors = ['article', 'main', 'div[role="main"]', 'div.post-content', 'div.entry-content'];
        let mainEl = null;
        for (let selector of mainContentSelectors) {
          mainEl = document.querySelector(selector);
          if (mainEl) break;
        }
        if (!mainEl) mainEl = document.body;
        const textElements = mainEl.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
        textElements.forEach(el => { content += el.innerText + '\n'; });
        articleText = content.trim() || document.body.innerText; // Final fallback
      }

      // 2. Extract Metadata
      const pageTitle = document.title || "";

      let siteName = "";
      const siteNameMeta = document.querySelector('meta[property="og:site_name"]');
      if (siteNameMeta && siteNameMeta.content) {
        siteName = siteNameMeta.content;
      } else {
        siteName = window.location.hostname; // Fallback to hostname
      }

      let pageDescription = "";
      const descriptionMeta = document.querySelector('meta[name="description"]');
      const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
      if (descriptionMeta && descriptionMeta.content) {
        pageDescription = descriptionMeta.content;
      } else if (ogDescriptionMeta && ogDescriptionMeta.content) {
        pageDescription = ogDescriptionMeta.content;
      }

      // 3. Send back the extracted data
      if (articleText && articleText.trim().length > 0) {
        sendResponse({
          articleText: articleText.trim(),
          pageTitle: pageTitle.trim(),
          siteName: siteName.trim(),
          pageDescription: pageDescription.trim()
        });
      } else {
        sendResponse({ error: "Could not extract meaningful text content using Readability." });
      }

    } catch (e) {
      console.error("Error in content_script during Readability processing:", e);
      sendResponse({ error: "Error extracting content with Readability: " + e.message });
    }
    return true; // Indicate that the response is sent asynchronously
  }
});
