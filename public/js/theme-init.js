// Restore user theme preference before first paint (CSP-compliant external script)
(function () {
  try {
    var saved = localStorage.getItem('netcoop-theme');
    document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');
  } catch (_e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
