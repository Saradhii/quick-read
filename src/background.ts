import type {
  PageDetails,
  SummaryResult,
  LengthPreference,
  GeminiRequestBody,
  GeminiResponse,
  GeminiErrorResponse,
  PageContentResponse,
  PageContentError,
  SummarizePageMessage
} from './types';

const GEMINI_API_KEY: string = 'YOUR_API_KEY';
const GEMINI_API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

async function summarizeWithGemini(pageDetails: PageDetails, lengthPreference: LengthPreference = 'short'): Promise<SummaryResult> {
  const apiKey = GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_API_KEY_GOES_HERE' || apiKey === 'YOUR_API_KEY') {
    return { error: "API Key not provided. Please add it to background.js" };
  }

  const { articleText, pageTitle, siteName, pageDescription } = pageDetails;

  if (!articleText || articleText.trim().length === 0) {
    return { summary: "No content provided to summarize." };
  }

  const maxArticleLength = 12000;
  let truncatedArticleText = articleText;
  if (articleText.length > maxArticleLength) {
    truncatedArticleText = articleText.substring(0, maxArticleLength) + "... (truncated)";
  }

  let promptSummaryLengthDetails = "a concise summary with 2-3 main points";
  if (lengthPreference === 'medium') {
    promptSummaryLengthDetails = "a slightly more detailed summary with 4-5 main points";
  }

  const prompt = `Given the following context about a web page:
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
    const requestBody: GeminiRequestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {}
    };

    const response = await fetch(fullApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody: GeminiErrorResponse = await response.json().catch(() => ({ error: { message: "Could not parse error JSON."} }));
      console.error('Gemini API Error:', errorBody);
      const errorMessage = errorBody?.error?.message || 'Details unavailable.';
      return { error: `Gemini API request failed: ${response.status} ${response.statusText}. ${errorMessage}` };
    }

    const data: GeminiResponse = await response.json();

    if (data.candidates && data.candidates.length > 0 && data.candidates[0]?.content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
      const firstPart = data.candidates[0].content.parts[0];
      if (firstPart) {
        const summaryMarkdown = firstPart.text;
        return { summary: summaryMarkdown.trim() };
      }
    }
    
    console.error('Gemini API: No content in response', data);
    if (data.promptFeedback?.blockReason) {
      const safetyRatings = data.promptFeedback.safetyRatings ? JSON.stringify(data.promptFeedback.safetyRatings) : '';
      return { error: `Content blocked by Gemini API: ${data.promptFeedback.blockReason}. ${safetyRatings}` };
    }
    return { error: "Could not extract summary from Gemini API response. The response might be empty or malformed." };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error calling Gemini API:', error);
    return { error: `Network or other error calling Gemini API: ${errorMessage}` };
  }
}

interface SummarizePageCandidate {
  action?: string;
  tabId?: number;
  lengthPreference?: string | null;
}

interface PageContentCandidate {
  articleText?: string;
  pageTitle?: string;
  siteName?: string;
  pageDescription?: string;
  error?: string;
}

const normalizeLengthPreference = (value: string | null | undefined): LengthPreference => (
  value === 'medium' ? 'medium' : 'short'
);

const hasSummarizePageShape = (
  message: SummarizePageMessage | SummarizePageCandidate | null
): message is SummarizePageCandidate & { action: 'summarizePage'; tabId: number } => (
  message !== null &&
  typeof message === 'object' &&
  message.action === 'summarizePage' &&
  typeof message.tabId === 'number'
);

type ArticleTextCarrier = { articleText: string };
type ErrorCarrier = { error: string };

const hasArticleTextProperty = (value: object): value is ArticleTextCarrier => (
  'articleText' in value && typeof (value as ArticleTextCarrier).articleText === 'string'
);

const hasErrorProperty = (value: object): value is ErrorCarrier => (
  'error' in value && typeof (value as ErrorCarrier).error === 'string'
);

const isPageDetailsResponse = (
  response: PageContentResponse | PageContentCandidate | null | undefined
): response is PageDetails => (
  response !== null && typeof response === 'object' && hasArticleTextProperty(response)
);

const isPageContentErrorResponse = (
  response: PageContentResponse | PageContentCandidate | null | undefined
): response is PageContentError => (
  response !== null && typeof response === 'object' && hasErrorProperty(response)
);

chrome.runtime.onMessage.addListener((request: SummarizePageMessage | SummarizePageCandidate | null, _sender: chrome.runtime.MessageSender, sendResponse: (response: SummaryResult) => void) => {
  if (!hasSummarizePageShape(request)) {
    sendResponse({ error: "Invalid summarizePage message format." });
    return false;
  }

  const { tabId } = request;
  const lengthPreference = normalizeLengthPreference(request.lengthPreference ?? undefined);

  chrome.scripting.executeScript({
    target: { tabId },
    files: ['lib/Readability.js', 'dist/content_script.js']
  }, (injectionResults: chrome.scripting.InjectionResult[] | undefined) => {
    if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) {
      const errorMessage = chrome.runtime.lastError ? chrome.runtime.lastError.message : "No results returned.";
      sendResponse({ error: `Failed to inject content script(s). ${errorMessage}` });
      return;
    }

    chrome.tabs.sendMessage(tabId, { action: "getPageContent" }, (contentResponse: PageContentCandidate | PageContentResponse | null) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: "Error getting content from page: " + chrome.runtime.lastError.message });
        return;
      }

      if (isPageDetailsResponse(contentResponse)) {
        const pageDetails: PageDetails = {
          articleText: contentResponse.articleText,
          pageTitle: contentResponse.pageTitle || '',
          siteName: contentResponse.siteName || '',
          pageDescription: contentResponse.pageDescription || ''
        };

        summarizeWithGemini(pageDetails, lengthPreference).then(summaryResult => {
          sendResponse(summaryResult);
        }).catch((error: Error | string | { message?: string }) => {
          const errorMessage = typeof error === 'string' ? error : error instanceof Error ? error.message : error.message || 'Unexpected error';
          sendResponse({ error: `Unexpected error during summarization: ${errorMessage}` });
        });
      } else if (isPageContentErrorResponse(contentResponse)) {
        sendResponse({ error: contentResponse.error });
      } else {
        sendResponse({ error: "No valid content or data received from content script." });
      }
    });
  });
  return true;
});
