# Quick Read Chrome Extension

## Description
This Chrome extension, Quick Read, allows users to quickly summarize web pages. It intelligently extracts the main article content, gathers contextual metadata (like page title and site name), and then uses the Gemini AI model to generate a summary. Summaries are presented in a clean, readable Markdown format directly in the popup. Users can choose their desired summary length and enjoy a modern, styled interface.

## Features
*   **Advanced Content Extraction:** Uses Mozilla's Readability.js to accurately extract the main article text, stripping away clutter.
*   **Context-Aware AI Summarization:** Provides page metadata (title, site name, description) to the Gemini model for more relevant summaries.
*   **Markdown Summaries:** Displays summaries in rich Markdown format (headings, lists, bold, etc.) for better readability.
*   **Customizable Summary Length:** Choose between "Concise Summary" or "Detailed Summary".
*   **Modern Interface:** Features a refreshed look with gradient elements and subtle animations.
*   **Loading Indicator:** Shows "Summarizing with AI..." during processing.

## Technical Details / Libraries Used
*   **Content Extraction:** Mozilla's `Readability.js` (`lib/Readability.js`)
*   **Markdown Rendering:** `markdown-it` (`lib/markdown-it.min.js`)
*   **AI Model:** Google Gemini (via API, model `gemini-1.5-flash-latest`)

## Setting Up Gemini API Key

**IMPORTANT:** This extension now uses the Google Gemini API for summarization. You will need to provide your own API key for this feature to work.

1.  **Obtain a Gemini API Key:**
    *   Visit Google AI Studio at [https://aistudio.google.com/](https://aistudio.google.com/).
    *   Sign in with your Google account.
    *   Create a new project or select an existing one.
    *   Navigate to the API key section (often "Get API key" or similar) and generate a new API key. Ensure the Gemini API (or "Generative Language API") is enabled for this key/project.
2.  **Add the API Key to the Extension:**
    *   Once you have the extension files on your local machine, open the `background.js` file in a text editor.
    *   Near the top of the file, you will find the following line:
        ```javascript
        const GEMINI_API_KEY = 'YOUR_API_KEY_GOES_HERE';
        ```
    *   Replace the placeholder text `'YOUR_API_KEY_GOES_HERE'` with your actual Gemini API key. For example, if your key is `AbCdEf12345`, the line should look like:
        ```javascript
        const GEMINI_API_KEY = 'AbCdEf12345';
        ```
    *   Save the `background.js` file.

Without a valid API key, the summarization will fail.

## How to Install (for Developers/Testers)

Since this extension is not yet on the Chrome Web Store, you can load it as an unpacked extension:

1.  **Download or Clone:** Get the extension files onto your local machine.
2.  **Add API Key:** Follow the instructions in the "Setting Up Gemini API Key" section above.
3.  **Open Chrome Extensions Page:**
    *   Open Google Chrome.
    *   Type `chrome://extensions` in the address bar and press Enter.
4.  **Enable Developer Mode:**
    *   In the top right corner of the Extensions page, toggle the "Developer mode" switch to the **on** position.
5.  **Load Unpacked:**
    *   Click the "Load unpacked" button that appears.
    *   Navigate to the directory where you saved/extracted the extension files (the one containing `manifest.json`).
    *   Click "Select Folder".
6.  **Extension Ready:** The Quick Read extension should now appear in your list.

## How to Use

1.  Ensure you have added your Gemini API key to `background.js`.
2.  Navigate to any web page you want to summarize.
3.  Click on the Quick Read extension icon in your Chrome toolbar.
4.  In the popup that appears, select your desired summary length (e.g., "Concise Summary" or "Detailed Summary") from the dropdown menu.
5.  Click the "Summarize Page" button.
6.  A "Summarizing with AI..." message will appear. Please wait a few moments.
7.  The AI-generated summary, formatted with headings, lists, etc., will appear in the popup.

## How Summarization Works

1.  **Advanced Content Extraction (`content_script.js`):**
    *   When you click "Summarize Page", the extension injects scripts into the current webpage.
    *   **Mozilla's Readability.js** is used to parse the page and extract the main article content, removing ads, navigation, and other non-essential elements.
    *   Key **metadata** is also extracted: the page title, site name (from meta tags or hostname), and page description (from meta tags).
2.  **Sending to Background (`popup.js` -> `background.js`):**
    *   The cleaned article text and the collected metadata are sent to the background script.
3.  **AI Summarization with Context (`background.js`):**
    *   The background script constructs a detailed prompt for the Google Gemini API. This prompt includes the extracted article text, page title, site name, and page description to give the AI better context.
    *   The AI is instructed to generate a summary in **Markdown format**, tailored to the user's selected length preference ("Concise" or "Detailed").
4.  **Displaying Markdown Summary (`popup.js`):**
    *   The Markdown summary from the Gemini API is sent to the popup.
    *   The `markdown-it` library is used within the popup to convert this Markdown text into richly formatted HTML.
    *   This HTML is then displayed in the summary area, showing headings, lists, bold/italic text, etc., as generated by the AI.

While the extension aims for quick summaries (ideally under a few seconds), the actual time can vary based on webpage complexity, content length, and Gemini API response times.

## Future Improvements (Potential)

*   More sophisticated text extraction methods.
*   User-configurable summary length or summarization style (via prompts).
*   Option to copy summary to clipboard.
*   More robust error handling and display for API issues.
*   Storing API key in `chrome.storage.local` for better security/persistence (would require user input field in options).
*   Caching summaries for recently visited pages.
*   Option to select text on page and summarize only selection.
