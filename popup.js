document.addEventListener('DOMContentLoaded', function() {
  const summarizeButton = document.getElementById('summarizeButton');
  const summaryDiv = document.getElementById('summary');
  const loaderDiv = document.getElementById('loader');
  const summaryLengthSelect = document.getElementById('summaryLength'); // Get dropdown element

  summarizeButton.addEventListener('click', function() {
    summaryDiv.innerHTML = '';
    loaderDiv.style.display = 'block';
    summaryDiv.style.display = 'none';
    summarizeButton.disabled = true; // Disable button
    summaryLengthSelect.disabled = true; // Disable dropdown

    const selectedLength = summaryLengthSelect.value; // Get selected length

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        loaderDiv.style.display = 'none';
        summaryDiv.style.display = 'block';
        summaryDiv.innerHTML = '<p>Error: No active tab found.</p>';
        summarizeButton.disabled = false; // Re-enable button
        summaryLengthSelect.disabled = false; // Re-enable dropdown
        return;
      }
      const activeTab = tabs[0];
      if (!activeTab.id) {
          loaderDiv.style.display = 'none';
          summaryDiv.style.display = 'block';
          summaryDiv.innerHTML = '<p>Error: Active tab has no ID.</p>';
          summarizeButton.disabled = false; // Re-enable button
          summaryLengthSelect.disabled = false; // Re-enable dropdown
          return;
      }

      chrome.runtime.sendMessage(
        {
          action: "summarizePage",
          tabId: activeTab.id,
          lengthPreference: selectedLength // Send length preference
        },
        function(response) {
          loaderDiv.style.display = 'none';
          summaryDiv.style.display = 'block';
          summarizeButton.disabled = false; // Re-enable button
          summaryLengthSelect.disabled = false; // Re-enable dropdown

          if (chrome.runtime.lastError) {
            summaryDiv.innerHTML = '<p>Error: ' + chrome.runtime.lastError.message + '</p>';
            return;
          }
          if (response && response.summary) {
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
