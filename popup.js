document.addEventListener('DOMContentLoaded', function() {
  const summarizeButton = document.getElementById('summarizeButton');
  const summaryDiv = document.getElementById('summary');

  summarizeButton.addEventListener('click', function() {
    summaryDiv.innerHTML = '<p>Summarizing...</p>'; // Provide immediate feedback

    // Send a message to the background script to start summarization
    // We need to get the current active tab to send its ID for content script injection
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        summaryDiv.innerHTML = '<p>Error: No active tab found.</p>';
        return;
      }
      const activeTab = tabs[0];
      if (!activeTab.id) {
          summaryDiv.innerHTML = '<p>Error: Active tab has no ID.</p>';
          return;
      }

      chrome.runtime.sendMessage(
        { action: "summarizePage", tabId: activeTab.id },
        function(response) {
          if (chrome.runtime.lastError) {
            // Handle errors, e.g., if the background script is not ready
            summaryDiv.innerHTML = '<p>Error: ' + chrome.runtime.lastError.message + '</p>';
            return;
          }
          if (response && response.summary) {
            // Display the summary
            let summaryHTML = '<ul>';
            response.summary.forEach(point => {
              summaryHTML += `<li>${point}</li>`;
            });
            summaryHTML += '</ul>';
            summaryDiv.innerHTML = summaryHTML;
          } else if (response && response.error) {
            summaryDiv.innerHTML = `<p>Error: ${response.error}</p>`;
          } else {
            summaryDiv.innerHTML = '<p>No summary received or an unknown error occurred.</p>';
          }
        }
      );
    });
  });
});
