document.addEventListener('DOMContentLoaded', function() {
  const enableTrackingCheckbox = document.getElementById('enableTracking');
  const tagCountSpan = document.getElementById('tagCount');

  // 从存储中获取设置
  chrome.storage.local.get(['enableTracking'], function(result) {
    enableTrackingCheckbox.checked = result.enableTracking !== false;
  });

  // 监听设置变化
  enableTrackingCheckbox.addEventListener('change', function() {
    chrome.storage.local.set({
      enableTracking: enableTrackingCheckbox.checked
    });
  });

  // 获取当前标签数量
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: 'getTagCount'}, function(response) {
      if (response && response.count) {
        tagCountSpan.textContent = response.count;
      }
    });
  });
}); 