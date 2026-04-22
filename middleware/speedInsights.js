/**
 * Vercel Speed Insights Middleware for Express
 * 
 * Speed Insights is a frontend monitoring tool that tracks Core Web Vitals.
 * Since this is a backend API server, this middleware provides utilities
 * for integrating Speed Insights with any HTML responses or frontend clients.
 * 
 * Usage:
 * 1. For HTML responses: Use injectSpeedInsights() to add the script to HTML
 * 2. For API responses: Return speedInsightsConfig() to frontend clients
 * 3. Frontend Integration: The frontend app should use @vercel/speed-insights
 */

/**
 * Returns the Speed Insights script tag for HTML injection
 * @returns {string} Script tag HTML string
 */
function getSpeedInsightsScript() {
  // For production deployments on Vercel, the script is automatically injected
  // This is a fallback for custom implementations
  return `
    <script>
      window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
    </script>
    <script defer src="/_vercel/speed-insights/script.js"></script>
  `;
}

/**
 * Middleware to inject Speed Insights into HTML responses
 * NOTE: This only works if your Express server returns HTML pages
 */
function injectSpeedInsights(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Only inject if response is HTML
    if (res.get('Content-Type') && res.get('Content-Type').includes('text/html')) {
      if (typeof data === 'string' && data.includes('</body>')) {
        const script = getSpeedInsightsScript();
        data = data.replace('</body>', `${script}</body>`);
      }
    }
    originalSend.call(this, data);
  };
  
  next();
}

/**
 * Returns configuration for frontend Speed Insights integration
 * Frontend apps should install @vercel/speed-insights and use this config
 */
function speedInsightsConfig() {
  return {
    enabled: process.env.NODE_ENV === 'production',
    framework: 'express-api',
    route: 'API Server',
    debug: process.env.NODE_ENV !== 'production'
  };
}

/**
 * API endpoint handler to provide Speed Insights status
 */
function speedInsightsStatus(req, res) {
  res.json({
    success: true,
    speedInsights: {
      enabled: true,
      package: '@vercel/speed-insights',
      version: require('../package.json').dependencies['@vercel/speed-insights'] || 'installed',
      message: 'Speed Insights is configured. Frontend clients should install @vercel/speed-insights package.',
      documentation: 'https://vercel.com/docs/speed-insights/quickstart',
      integration: {
        react: 'import { SpeedInsights } from "@vercel/speed-insights/react"',
        nextjs: 'import { SpeedInsights } from "@vercel/speed-insights/next"',
        vue: 'import { SpeedInsights } from "@vercel/speed-insights/vue"',
        svelte: 'import { injectSpeedInsights } from "@vercel/speed-insights/sveltekit"'
      }
    }
  });
}

module.exports = {
  injectSpeedInsights,
  speedInsightsConfig,
  speedInsightsStatus,
  getSpeedInsightsScript
};
