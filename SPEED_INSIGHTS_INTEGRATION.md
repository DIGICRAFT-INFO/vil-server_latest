# Vercel Speed Insights Integration Guide

## Overview
This backend API has been configured with Vercel Speed Insights support. Speed Insights is a frontend performance monitoring tool that tracks Core Web Vitals and provides real user monitoring (RUM) data.

## Backend Configuration
The backend provides the following Speed Insights utilities:

### 1. Speed Insights Status Endpoint
```
GET /api/speed-insights
```

Returns information about Speed Insights configuration and integration instructions for frontend clients.

### 2. Middleware Available
The `middleware/speedInsights.js` module provides:
- `injectSpeedInsights()` - Middleware to inject Speed Insights into HTML responses
- `speedInsightsConfig()` - Configuration helper for frontend clients
- `getSpeedInsightsScript()` - Returns the Speed Insights script tag

## Frontend Integration

### For React Applications
1. Install the package:
```bash
npm install @vercel/speed-insights
```

2. Add to your root component:
```jsx
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  return (
    <>
      {/* Your app content */}
      <SpeedInsights />
    </>
  );
}
```

### For Next.js Applications
1. Install the package:
```bash
npm install @vercel/speed-insights
```

2. Add to your root layout (`app/layout.tsx` or `app/layout.jsx`):
```jsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### For Vue Applications
1. Install the package:
```bash
npm install @vercel/speed-insights
```

2. Add to your root component:
```vue
<script setup>
import { SpeedInsights } from '@vercel/speed-insights/vue';
</script>

<template>
  <div id="app">
    <!-- Your app content -->
    <SpeedInsights />
  </div>
</template>
```

### For SvelteKit Applications
1. Install the package:
```bash
npm install @vercel/speed-insights
```

2. Add to your root layout:
```typescript
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
injectSpeedInsights();
```

## Verification

### 1. Check Backend Status
After deployment, verify the Speed Insights configuration:
```bash
curl https://your-api-domain.vercel.app/api/speed-insights
```

### 2. Enable in Vercel Dashboard
1. Go to your project in Vercel Dashboard
2. Navigate to the Speed Insights tab
3. Click "Enable Speed Insights"

### 3. Verify Frontend Integration
After deploying your frontend:
1. Open your deployed site
2. Open browser DevTools > Network tab
3. Look for a request to `/_vercel/speed-insights/script.js`
4. Check the Vercel Dashboard Speed Insights tab for incoming data

## Important Notes

- **Speed Insights is a frontend tool**: It monitors client-side performance metrics like Core Web Vitals (LCP, FID, CLS)
- **Automatic on Vercel**: When deployed to Vercel, Speed Insights is automatically available
- **Data appears after deployment**: You need real user traffic to see data in the dashboard
- **Production only**: Speed Insights typically only tracks production deployments

## Resources

- [Vercel Speed Insights Documentation](https://vercel.com/docs/speed-insights)
- [Speed Insights Quickstart](https://vercel.com/docs/speed-insights/quickstart)
- [Core Web Vitals](https://web.dev/vitals/)

## Package Information

- **Package**: `@vercel/speed-insights`
- **Version**: `^2.0.0`
- **Installed**: ✅ Yes
- **Backend Support**: Configured
- **Frontend Support**: Requires frontend integration (see above)
