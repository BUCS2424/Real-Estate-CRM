import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import "@/index.css";
import App from "@/App";

// Emergency stability guard: clear stale service workers/caches that can serve broken app shells.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        const staleKeys = cacheKeys.filter(
          (key) => key.includes('fusion-crm') || key.includes('hidden-haven-crm')
        );
        await Promise.all(staleKeys.map((key) => caches.delete(key)));
      }
    } catch (error) {
      // no-op
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
);
