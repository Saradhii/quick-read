document.addEventListener('DOMContentLoaded', function() {
  const summarizeButton = document.getElementById('summarizeButton');
  const summaryDiv = document.getElementById('summary');
  const loaderDiv = document.getElementById('loader');
  const summaryLengthSelect = document.getElementById('summaryLength');

  // NEW: Initialize markdown-it
  // Check if markdownit is loaded (it should be, as it's included before this script)
  let md;
  if (typeof window.markdownit === 'function') {
    md = window.markdownit({
      html: false, // Keep false for security if you don't expect HTML in MD from LLM
      linkify: true, // Autoconvert URL-like text to links
      typographer: true // Enable some language-neutral replacement + quotes beautification
    });
  } else {
    console.error("markdown-it not loaded! Summaries will be plain text.");
    // Fallback: create a dummy md object that just returns the text
    md = { render: (text) => text };
  }


  summarizeButton.addEventListener('click', function() {
    summaryDiv.innerHTML = '';
    loaderDiv.style.display = 'block';
    summaryDiv.style.display = 'none';
    summarizeButton.disabled = true;
    summaryLengthSelect.disabled = true;

    const selectedLength = summaryLengthSelect.value;

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        // ... (error handling as before)
        loaderDiv.style.display = 'none';
        summaryDiv.style.display = 'block';
        summaryDiv.innerHTML = '<p>Error: No active tab found.</p>';
        summarizeButton.disabled = false;
        summaryLengthSelect.disabled = false;
        return;
      }
      const activeTab = tabs[0];
      if (!activeTab.id) {
        // ... (error handling as before)
        loaderDiv.style.display = 'none';
        summaryDiv.style.display = 'block';
        summaryDiv.innerHTML = '<p>Error: Active tab has no ID.</p>';
        summarizeButton.disabled = false;
        summaryLengthSelect.disabled = false;
        return;
      }

      chrome.runtime.sendMessage(
        {
          action: "summarizePage",
          tabId: activeTab.id,
          lengthPreference: selectedLength
        },
        function(response) {
          loaderDiv.style.display = 'none';
          summaryDiv.style.display = 'block';
          summarizeButton.disabled = false;
          summaryLengthSelect.disabled = false;

          if (chrome.runtime.lastError) {
            summaryDiv.innerHTML = `<p><strong>Error:</strong> ${chrome.runtime.lastError.message}</p>`; // Display errors more clearly
            return;
          }
          if (response && response.summary) {
            // NEW: Render Markdown summary
            summaryDiv.innerHTML = md.render(response.summary);
          } else if (response && response.error) {
            // Display error more clearly, maybe also use md.render if errors could contain markdown-like text (unlikely for now)
            summaryDiv.innerHTML = `<p><strong>Error:</strong> ${response.error}</p>`;
          } else {
            summaryDiv.innerHTML = '<p>No summary received or an unknown error occurred.</p>';
          }
        }
      );
    });
  });
});
