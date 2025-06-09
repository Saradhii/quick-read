# Web Page Summarizer Chrome Extension

## Description

This Chrome extension allows users to quickly summarize the textual content of the current web page they are viewing. With a click of a button, the extension extracts the main text from the page and generates a short, bullet-point summary.

This is a simple extension focused on functionality, using basic algorithms for content extraction and summarization. It does not rely on external APIs or databases and uses local processing.

## Features

*   **One-click Summarization:** Summarize the active tab's content easily from the extension popup.
*   **Text Extraction:** Attempts to identify and extract the main textual content from a webpage.
*   **Simple Summary:** Provides a few bullet points highlighting key sentences from the text.

## How to Install (for Developers/Testers)

Since this extension is not yet on the Chrome Web Store, you can load it as an unpacked extension:

1.  **Download or Clone:** Get the extension files onto your local machine. If you have git, you can clone the repository. Otherwise, download the source code (e.g., as a ZIP file and extract it).
2.  **Open Chrome Extensions Page:**
    *   Open Google Chrome.
    *   Type `chrome://extensions` in the address bar and press Enter.
3.  **Enable Developer Mode:**
    *   In the top right corner of the Extensions page, toggle the "Developer mode" switch to the **on** position.
4.  **Load Unpacked:**
    *   Click the "Load unpacked" button that appears.
    *   Navigate to the directory where you saved/extracted the extension files.
    *   Select the main folder that contains the `manifest.json` file.
    *   Click "Select Folder".
5.  **Extension Ready:** The "Web Page Summarizer" extension should now appear in your list of extensions and its icon should be visible in the Chrome toolbar (you might need to pin it).

## How to Use

1.  Navigate to any web page you want to summarize.
2.  Click on the "Web Page Summarizer" extension icon in your Chrome toolbar.
3.  In the popup that appears, click the "Summarize Page" button.
4.  The summary will appear in the popup below the button.

## How Summarization Works (Basic)

1.  **Content Extraction (`content_script.js`):** When you click "Summarize Page", a content script is injected into the current webpage. This script tries to find the main content area of the page (looking for common HTML tags like `<article>`, `<main>`, or specific `div` elements). It then extracts text from paragraphs and headings within this area. If it can't find a clear main content block, it falls back to extracting all visible text from the page body.
2.  **Sending to Background (`popup.js` -> `background.js`):** The extracted text is sent to a background script.
3.  **Summarization (`background.js`):**
    *   The background script takes the received text.
    *   It splits the text into individual sentences.
    *   Sentences are lightly filtered (e.g., very short or very long sentences are removed).
    *   A few sentences (typically the first few, with an attempt to include one from the middle) are selected to form the summary.
    *   This summary is then sent back to the popup to be displayed.

This is a heuristic-based approach and its effectiveness can vary depending on the structure and content of the webpage.

## Future Improvements (Potential)

*   More sophisticated text extraction methods.
*   Advanced summarization algorithms (e.g., TF-IDF, machine learning models - though this would increase complexity significantly).
*   User-configurable summary length.
*   Option to copy summary to clipboard.
*   Handling of dynamic content loaded after initial page load.
