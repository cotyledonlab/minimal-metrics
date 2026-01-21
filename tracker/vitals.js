/**
 * Minimal Metrics - Web Vitals Module
 *
 * This is an OPTIONAL module that tracks Core Web Vitals.
 * Include this script AFTER the main tracker.min.js if you want
 * performance metrics.
 *
 * Usage:
 * <script src="https://your-domain.com/tracker.min.js" data-host="https://your-domain.com"></script>
 * <script src="https://your-domain.com/vitals.js"></script>
 *
 * This will track:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 */

(function() {
  'use strict';

  // Check if main tracker is available
  if (!window.mm || typeof window.mm.track !== 'function') {
    console.warn('Minimal Metrics: Main tracker not found. Load tracker.min.js first.');
    return;
  }

  // Track a web vital metric
  function trackVital(name, value, rating) {
    window.mm.track('web-vital', {
      metric: name,
      value: Math.round(value),
      rating: rating // 'good', 'needs-improvement', or 'poor'
    });
  }

  // Get rating based on thresholds
  function getRating(name, value) {
    const thresholds = {
      LCP: [2500, 4000],
      FID: [100, 300],
      CLS: [0.1, 0.25],
      FCP: [1800, 3000],
      TTFB: [800, 1800]
    };

    const [good, poor] = thresholds[name] || [0, 0];

    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  // Largest Contentful Paint
  function observeLCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(function(list) {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          const value = lastEntry.startTime;
          trackVital('LCP', value, getRating('LCP', value));
        }
      });

      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      // Stop observing after page becomes hidden
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
          observer.takeRecords();
          observer.disconnect();
        }
      }, { once: true });
    } catch (e) {
      // LCP not supported
    }
  }

  // First Input Delay
  function observeFID() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(function(list) {
        const entries = list.getEntries();
        const firstEntry = entries[0];
        if (firstEntry) {
          const value = firstEntry.processingStart - firstEntry.startTime;
          trackVital('FID', value, getRating('FID', value));
          observer.disconnect();
        }
      });

      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // FID not supported
    }
  }

  // Cumulative Layout Shift
  function observeCLS() {
    if (!('PerformanceObserver' in window)) return;

    try {
      var clsValue = 0;
      var sessionValue = 0;
      var sessionEntries = [];

      const observer = new PerformanceObserver(function(list) {
        for (var i = 0; i < list.getEntries().length; i++) {
          var entry = list.getEntries()[i];
          // Only count layout shifts without recent input
          if (!entry.hadRecentInput) {
            var firstSessionEntry = sessionEntries[0];
            var lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            // If the entry occurred less than 1 second after the previous entry
            // and less than 5 seconds after the first entry in the session,
            // include the entry in the current session
            if (sessionValue &&
                entry.startTime - lastSessionEntry.startTime < 1000 &&
                entry.startTime - firstSessionEntry.startTime < 5000) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              sessionValue = entry.value;
              sessionEntries = [entry];
            }

            if (sessionValue > clsValue) {
              clsValue = sessionValue;
            }
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });

      // Report CLS when page becomes hidden
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
          observer.takeRecords();
          observer.disconnect();
          trackVital('CLS', clsValue * 1000, getRating('CLS', clsValue)); // Multiply by 1000 for easier reading
        }
      }, { once: true });
    } catch (e) {
      // CLS not supported
    }
  }

  // First Contentful Paint
  function observeFCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver(function(list) {
        const entries = list.getEntries();
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].name === 'first-contentful-paint') {
            var value = entries[i].startTime;
            trackVital('FCP', value, getRating('FCP', value));
            observer.disconnect();
            break;
          }
        }
      });

      observer.observe({ type: 'paint', buffered: true });
    } catch (e) {
      // FCP not supported
    }
  }

  // Time to First Byte
  function observeTTFB() {
    try {
      var navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        var value = navigation.responseStart;
        trackVital('TTFB', value, getRating('TTFB', value));
      }
    } catch (e) {
      // TTFB not supported
    }
  }

  // Initialize observers
  if (document.readyState === 'complete') {
    observeLCP();
    observeFID();
    observeCLS();
    observeFCP();
    observeTTFB();
  } else {
    window.addEventListener('load', function() {
      observeLCP();
      observeFID();
      observeCLS();
      observeFCP();
      observeTTFB();
    });
  }

  // Expose for manual tracking if needed
  window.mm.vitals = {
    trackVital: trackVital,
    getRating: getRating
  };
})();
