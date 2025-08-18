(function() {
  'use strict';
  
  const ENDPOINT = '/api/collect';
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') {
    return;
  }
  
  function getSessionId() {
    const key = '_mm_sid';
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem(key, sid);
    }
    return sid;
  }
  
  function collectData() {
    return {
      url: window.location.href,
      ref: document.referrer || null,
      sid: getSessionId(),
      scr: `${screen.width}x${screen.height}`,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ts: Date.now()
    };
  }
  
  function sendBeacon(data, retries = 0) {
    const url = (window.MM_HOST || '') + ENDPOINT;
    
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      if (!navigator.sendBeacon(url, blob) && retries < MAX_RETRIES) {
        setTimeout(() => sendBeacon(data, retries + 1), RETRY_DELAY * Math.pow(2, retries));
      }
    } else {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onerror = function() {
        if (retries < MAX_RETRIES) {
          setTimeout(() => sendBeacon(data, retries + 1), RETRY_DELAY * Math.pow(2, retries));
        }
      };
      xhr.send(JSON.stringify(data));
    }
  }
  
  function trackPageView() {
    if (document.visibilityState === 'visible') {
      sendBeacon(collectData());
    }
  }
  
  function trackEvent(name, props) {
    const data = collectData();
    data.evt = name;
    data.props = props || {};
    sendBeacon(data);
  }
  
  if (document.readyState === 'complete') {
    trackPageView();
  } else {
    window.addEventListener('load', trackPageView);
  }
  
  let lastUrl = window.location.href;
  const observer = new MutationObserver(function() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      trackPageView();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      trackPageView();
    }
  });
  
  window.mm = {
    track: trackEvent
  };
})();