/**
 * COCOARENA - API Configuration & Offline Fallback Helper
 * Handles local development, native Android WebView, and remote Wi-Fi server synchronization.
 */
(function () {
  window.COCO_CONFIG = {
    // Check if running inside Capacitor Android app
    isNative: function () {
      return (
        (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
        window.location.protocol === 'capacitor:' ||
        (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && !window.location.port)
      );
    },

    // Get current backend API base URL
    getServerUrl: function () {
      const stored = localStorage.getItem('cocoarena_server_url');
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, '');
      }
      // If in browser on PC, relative URL is fine
      if (!this.isNative()) {
        return '';
      }
      // When in native Android app without explicit remote URL, default to empty (graceful local storage)
      return '';
    },

    // Set server URL (e.g. http://192.168.1.5:3000)
    setServerUrl: function (url) {
      if (url && url.trim()) {
        localStorage.setItem('cocoarena_server_url', url.trim());
      } else {
        localStorage.removeItem('cocoarena_server_url');
      }
    },

    // Resolve an endpoint path
    resolveUrl: function (endpoint) {
      const base = this.getServerUrl();
      if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
      return base ? (base + endpoint) : endpoint;
    }
  };
})();
