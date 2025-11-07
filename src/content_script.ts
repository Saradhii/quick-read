/// <reference path="./global.d.ts" />
import type { PageDetails, PageContentError } from './types';

if (typeof Readability === 'undefined') {
  console.error("Readability.js not loaded before content_script.js");
}

interface GetPageContentMessageCandidate {
  action?: string;
}

const isGetPageContentMessage = (
  message: GetPageContentMessageCandidate | null
): message is { action: 'getPageContent' } => (
  message !== null &&
  typeof message === 'object' &&
  message.action === 'getPageContent'
);

chrome.runtime.onMessage.addListener((request: GetPageContentMessageCandidate | null, _sender: chrome.runtime.MessageSender, sendResponse: (response: PageDetails | PageContentError) => void) => {
  if (!isGetPageContentMessage(request)) {
    sendResponse({ error: "Invalid request format." });
    return false;
  }

  if (request.action === "getPageContent") {
    try {
      const documentClone = document.cloneNode(true) as Document;
      const article = new Readability(documentClone).parse();

      let articleText = '';
      if (article?.textContent) {
        articleText = article.textContent;
      } else {
        console.warn("Readability could not parse the article effectively, falling back to simple text extraction.");
        let content = '';
        const mainContentSelectors = ['article', 'main', 'div[role="main"]', 'div.post-content', 'div.entry-content'];
        let mainEl: Element | null = null;
        for (const selector of mainContentSelectors) {
          mainEl = document.querySelector(selector);
          if (mainEl) break;
        }
        if (!mainEl) mainEl = document.body;
        const textElements = mainEl.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
        textElements.forEach(el => { 
          if (el instanceof HTMLElement) {
            content += el.innerText + '\n';
          }
        });
        articleText = content.trim() || document.body.innerText;
      }

      const pageTitle = document.title || "";

      let siteName = "";
      const siteNameMeta = document.querySelector('meta[property="og:site_name"]');
      if (siteNameMeta instanceof HTMLMetaElement && siteNameMeta.content) {
        siteName = siteNameMeta.content;
      } else {
        siteName = window.location.hostname;
      }

      let pageDescription = "";
      const descriptionMeta = document.querySelector('meta[name="description"]');
      const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
      if (descriptionMeta instanceof HTMLMetaElement && descriptionMeta.content) {
        pageDescription = descriptionMeta.content;
      } else if (ogDescriptionMeta instanceof HTMLMetaElement && ogDescriptionMeta.content) {
        pageDescription = ogDescriptionMeta.content;
      }

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
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      console.error("Error in content_script during Readability processing:", e);
      sendResponse({ error: `Error extracting content with Readability: ${errorMessage}` });
    }
    return true;
  }

  return false;
});
