/// <reference path="./global.d.ts" />
import type { SummaryResult, SummarySuccess, SummaryError, LengthPreference, MarkdownIt } from './types';

function isSummarySuccess(result: SummaryResult): result is SummarySuccess {
  return typeof result === 'object' && result !== null && 'summary' in result;
}

function isSummaryError(result: SummaryResult): result is SummaryError {
  return typeof result === 'object' && result !== null && 'error' in result;
}

document.addEventListener('DOMContentLoaded', () => {
  const summarizeButtonElement = document.getElementById('summarizeButton');
  if (!(summarizeButtonElement instanceof HTMLButtonElement)) {
    throw new Error('Summarize button element not found.');
  }

  const summaryDivElement = document.getElementById('summary');
  if (!(summaryDivElement instanceof HTMLDivElement)) {
    throw new Error('Summary container element not found.');
  }

  const loaderDivElement = document.getElementById('loader');
  if (!(loaderDivElement instanceof HTMLDivElement)) {
    throw new Error('Loader element not found.');
  }

  const summaryLengthSelectElement = document.getElementById('summaryLength');
  if (!(summaryLengthSelectElement instanceof HTMLSelectElement)) {
    throw new Error('Summary length select element not found.');
  }

  let mdRenderer: MarkdownIt | { render: (text: string) => string };
  if (typeof window.markdownit === 'function') {
    mdRenderer = window.markdownit({
      html: false,
      linkify: true,
      typographer: true
    });
  } else {
    console.error('markdown-it not loaded! Summaries will be plain text.');
    mdRenderer = { render: (text: string) => text };
  }

  const setLoadingState = (isLoading: boolean) => {
    loaderDivElement.style.display = isLoading ? 'block' : 'none';
    summaryDivElement.style.display = isLoading ? 'none' : 'block';
    summarizeButtonElement.disabled = isLoading;
    summaryLengthSelectElement.disabled = isLoading;
  };

  summarizeButtonElement.addEventListener('click', () => {
    summaryDivElement.innerHTML = '';
    setLoadingState(true);

    const selectedLength = summaryLengthSelectElement.value as LengthPreference;

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (chrome.runtime.lastError) {
        setLoadingState(false);
        summaryDivElement.innerHTML = `<p><strong>Error:</strong> ${chrome.runtime.lastError.message}</p>`;
        return;
      }

      if (!Array.isArray(tabs) || tabs.length === 0) {
        setLoadingState(false);
        summaryDivElement.innerHTML = '<p>Error: No active tab found.</p>';
        return;
      }

      const activeTab = tabs[0];
      if (typeof activeTab?.id !== 'number') {
        setLoadingState(false);
        summaryDivElement.innerHTML = '<p>Error: Active tab has no ID.</p>';
        return;
      }

      const message = {
        action: 'summarizePage' as const,
        tabId: activeTab.id,
        lengthPreference: selectedLength
      };

      chrome.runtime.sendMessage(message, response => {
        setLoadingState(false);

        if (chrome.runtime.lastError) {
          summaryDivElement.innerHTML = `<p><strong>Error:</strong> ${chrome.runtime.lastError.message}</p>`;
          return;
        }

        const result = response as SummaryResult | undefined;

        if (!result) {
          summaryDivElement.innerHTML = '<p>No summary received or an unknown error occurred.</p>';
          return;
        }

        if (isSummarySuccess(result)) {
          summaryDivElement.innerHTML = mdRenderer.render(result.summary);
        } else if (isSummaryError(result)) {
          summaryDivElement.innerHTML = `<p><strong>Error:</strong> ${result.error}</p>`;
        } else {
          summaryDivElement.innerHTML = '<p>No summary received or an unknown error occurred.</p>';
        }
      });
    });
  });
});
