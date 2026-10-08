/* Add the owner-approved GA4 measurement ID here when it is supplied. */
(() => {
  const measurementId = '';
  if (!/^G-[A-Z0-9]+$/.test(measurementId)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
})();
