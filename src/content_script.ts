import type { PageDetails, PageContentError, ReadabilityArticle } from './types';

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

class ReadabilityExtractor {
  private static readonly preferredSelectors: readonly string[] = [
    'article',
    'main',
    'section[role="main"]',
    'div[role="main"]',
    'div[data-article-body]',
    '.article',
    '.article-content',
    '.post-content',
    '.entry-content'
  ];

  private static readonly fallbackSelector = [
    'article',
    'main',
    'section',
    'div[role="main"]',
    'div.article',
    'div.post',
    'div.post-content',
    'div.entry-content'
  ].join(', ');

  private static readonly blocklistSelector = [
    'script',
    'style',
    'noscript',
    'iframe',
    'object',
    'embed',
    'form',
    'nav',
    'footer',
    'header',
    'aside',
    'svg',
    'canvas',
    '[aria-hidden="true"]'
  ].join(', ');

  private static readonly minimumPrimaryTextLength = 400;

  private readonly doc: Document;

  constructor(doc: Document) {
    this.doc = doc;
  }

  parse(): ReadabilityArticle | null {
    const mainElement = this.findMainElement();
    if (!mainElement) {
      return null;
    }

    const wrapper = this.doc.createElement('div');
    const mainClone = mainElement.cloneNode(true);
    wrapper.appendChild(mainClone);

    this.removeUnwantedNodes(wrapper);

    const textContent = this.extractText(wrapper).trim();
    if (textContent.length === 0) {
      return null;
    }

    return {
      title: this.getTitle(),
      content: wrapper.innerHTML,
      textContent,
      length: textContent.length,
      excerpt: ReadabilityExtractor.buildExcerpt(textContent),
      byline: this.getByline(),
      dir: this.getDirection(),
      siteName: this.getSiteName(),
      lang: this.getLanguage()
    };
  }

  extractFallbackText(): string {
    const wrapper = this.doc.createElement('div');
    wrapper.appendChild(this.doc.body.cloneNode(true));
    this.removeUnwantedNodes(wrapper);
    return this.extractText(wrapper).trim() || (this.doc.body.textContent?.trim() ?? '');
  }

  getTitle(): string {
    return this.doc.title || '';
  }

  getByline(): string {
    const authorMeta = this.doc.querySelector('meta[name="author"], meta[property="article:author"]');
    if (authorMeta instanceof HTMLMetaElement && authorMeta.content) {
      return authorMeta.content.trim();
    }

    const relAuthor = this.doc.querySelector('[rel="author"], [itemprop="author"], [class*="author"]');
    if (relAuthor instanceof HTMLElement) {
      return relAuthor.textContent?.trim() ?? '';
    }

    return '';
  }

  getSiteName(): string {
    const siteNameMeta = this.doc.querySelector('meta[property="og:site_name"], meta[name="application-name"]');
    if (siteNameMeta instanceof HTMLMetaElement && siteNameMeta.content) {
      return siteNameMeta.content.trim();
    }

    try {
      const url = new URL(this.doc.URL);
      return url.hostname;
    } catch (_error) {
      return window.location.hostname;
    }
  }

  getLanguage(): string {
    return this.doc.documentElement.lang || '';
  }

  getDirection(): string {
    return this.doc.dir || this.doc.documentElement.dir || 'ltr';
  }

  static getPageDescription(doc: Document): string {
    const meta = doc.querySelector(
      'meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]'
    );
    if (meta instanceof HTMLMetaElement && meta.content) {
      return meta.content.trim();
    }
    return '';
  }

  private findMainElement(): Element | null {
    for (const selector of ReadabilityExtractor.preferredSelectors) {
      const candidate = this.doc.querySelector(selector);
      if (candidate instanceof HTMLElement) {
        const textLength = this.extractText(candidate).trim().length;
        if (textLength >= ReadabilityExtractor.minimumPrimaryTextLength) {
          return candidate;
        }
      }
    }

    const fallbackCandidates = Array.from(this.doc.querySelectorAll(ReadabilityExtractor.fallbackSelector));
    let bestCandidate: Element | null = null;
    let bestScore = 0;

    fallbackCandidates.forEach(candidate => {
      if (candidate instanceof HTMLElement) {
        const textLength = this.extractText(candidate).trim().length;
        if (textLength > bestScore) {
          bestScore = textLength;
          bestCandidate = candidate;
        }
      }
    });

    if (bestCandidate && bestScore >= ReadabilityExtractor.minimumPrimaryTextLength / 2) {
      return bestCandidate;
    }

    return this.doc.body;
  }

  private removeUnwantedNodes(root: Element): void {
    const removableNodes = root.querySelectorAll(ReadabilityExtractor.blocklistSelector);
    removableNodes.forEach(node => {
      node.remove();
    });

    root.querySelectorAll('[style]').forEach(element => {
      if (element instanceof HTMLElement) {
        element.removeAttribute('style');
      }
    });
  }

  private extractText(root: Element): string {
    const segments: string[] = [];
    const textNodes = root.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote');
    textNodes.forEach(node => {
      const text = node.textContent?.trim();
      if (text) {
        segments.push(text);
      }
    });

    if (segments.length > 0) {
      return segments.join('\n');
    }

    return root.textContent?.trim() ?? '';
  }

  private static buildExcerpt(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 200) {
      return normalized;
    }

    const truncated = normalized.slice(0, 200);
    const lastSentenceBreak = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('!'), truncated.lastIndexOf('?'));
    if (lastSentenceBreak > 120) {
      return `${truncated.slice(0, lastSentenceBreak + 1)}…`;
    }

    return `${truncated}…`;
  }
}

chrome.runtime.onMessage.addListener((request: GetPageContentMessageCandidate | null, _sender: chrome.runtime.MessageSender, sendResponse: (response: PageDetails | PageContentError) => void) => {
  if (!isGetPageContentMessage(request)) {
    sendResponse({ error: 'Invalid request format.' });
    return false;
  }

  try {
    const extractor = new ReadabilityExtractor(document);
    const article = extractor.parse();
    const articleText = (article?.textContent ?? extractor.extractFallbackText()).trim();

    if (articleText.length === 0) {
      sendResponse({ error: 'Could not extract meaningful text content from this page.' });
      return true;
    }

    const pageDetails: PageDetails = {
      articleText,
      pageTitle: (article?.title ?? extractor.getTitle()).trim(),
      siteName: (article?.siteName ?? extractor.getSiteName()).trim(),
      pageDescription: ReadabilityExtractor.getPageDescription(document)
    };

    sendResponse(pageDetails);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendResponse({ error: `Error extracting content: ${message}` });
  }

  return true;
});
