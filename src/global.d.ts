import { MarkdownItOptions, MarkdownIt, ReadabilityArticle } from './types';

declare global {
  interface Window {
    markdownit?: (options?: MarkdownItOptions) => MarkdownIt;
  }

  class Readability {
    constructor(doc: Document);
    parse(): ReadabilityArticle | null;
  }
}

export {};
