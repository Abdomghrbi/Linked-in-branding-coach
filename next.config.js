const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst', 
      options: {
        cacheName: 'offlineCache',
        networkTimeoutSeconds: 5,
      },
    },
  ],
});
module.exports = withPWA({
});
