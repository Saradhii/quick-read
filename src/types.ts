export interface PageDetails {
  articleText: string;
  pageTitle: string;
  siteName: string;
  pageDescription: string;
}

export interface PageContentError {
  error: string;
}

export type PageContentResponse = PageDetails | PageContentError;

export interface SummarySuccess {
  summary: string;
}

export interface SummaryError {
  error: string;
}

export type SummaryResult = SummarySuccess | SummaryError;

export type LengthPreference = 'short' | 'medium';

export interface SummarizePageMessage {
  action: 'summarizePage';
  tabId: number;
  lengthPreference: LengthPreference;
}

export interface GetPageContentMessage {
  action: 'getPageContent';
}

export type ChromeMessage = SummarizePageMessage | GetPageContentMessage;

export interface GeminiCandidate {
  content: {
    parts: Array<{
      text: string;
    }>;
  };
}

export interface GeminiPromptFeedback {
  blockReason?: string;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: GeminiPromptFeedback;
}

export interface GeminiErrorResponse {
  error?: {
    message?: string;
  };
}

export interface GeminiRequestBody {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: Record<string, never>;
}

export interface ReadabilityArticle {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  dir: string;
  siteName: string;
  lang: string;
}

export interface MarkdownItOptions {
  html?: boolean;
  linkify?: boolean;
  typographer?: boolean;
}

export interface MarkdownIt {
  render: (text: string) => string;
}

export interface ChromeTab extends chrome.tabs.Tab {
  id: number;
}
