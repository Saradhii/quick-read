document.addEventListener('DOMContentLoaded', function() {
  const summarizeButton = document.getElementById('summarizeButton');
  const summaryDiv = document.getElementById('summary');
  const loaderDiv = document.getElementById('loader'); // Get loader element

  summarizeButton.addEventListener('click', function() {
    summaryDiv.innerHTML = ''; // Clear previous summary/error
    loaderDiv.style.display = 'block'; // Show loader
    summaryDiv.style.display = 'none'; // Hide summary area while loading

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        loaderDiv.style.display = 'none'; // Hide loader
        summaryDiv.style.display = 'block'; // Show summary area
        summaryDiv.innerHTML = '<p>Error: No active tab found.</p>';
        return;
      }
      const activeTab = tabs[0];
      if (!activeTab.id) {
          loaderDiv.style.display = 'none'; // Hide loader
          summaryDiv.style.display = 'block'; // Show summary area
          summaryDiv.innerHTML = '<p>Error: Active tab has no ID.</p>';
          return;
      }

      chrome.runtime.sendMessage(
        { action: "summarizePage", tabId: activeTab.id },
        function(response) {
          loaderDiv.style.display = 'none'; // Hide loader
          summaryDiv.style.display = 'block'; // Show summary area

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
