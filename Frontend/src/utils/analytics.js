export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || "";
  if (!measurementId || typeof window === 'undefined') return;

  // Check if script is already injected
  if (document.getElementById('google-analytics-script')) return;

  // Create script tag for gtag.js
  const script = document.createElement('script');
  script.id = 'google-analytics-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag function
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true
  });
};
