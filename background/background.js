chrome.runtime.onInstalled.addListener(function() {
  // 初始化存储设置
  chrome.storage.local.set({
    enableTracking: true
  });
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    chrome.storage.local.get(['enableTracking'], function(result) {
      if (result.enableTracking) {
        chrome.tabs.sendMessage(tabId, {
          type: 'initializeTracker'
        });
      }
    });
  }
}); 