// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Update online/offline status
function updateOnlineStatus() {
  const statusElement = document.getElementById('status');
  if (!statusElement) return; // Exit if element doesn't exist

  if (navigator.onLine) {
    statusElement.textContent = 'Online';
    statusElement.className = 'online';
  } else {
    statusElement.textContent = 'Offline';
    statusElement.className = 'offline';
  }
}

// Listen for online/offline events
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Initial status check
window.addEventListener('load', updateOnlineStatus);

// iOS standalone mode detection
if (window.navigator.standalone) {
  console.log('Running in standalone mode (installed on home screen)');
}
