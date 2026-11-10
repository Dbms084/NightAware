const fs = require('fs');
const path = require('path');

function resolveApiKey() {
  if (process.env.GOOGLE_MAPS_API_KEY) return process.env.GOOGLE_MAPS_API_KEY.trim();
  if (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.trim();

  // Fallback direct read from .env if process.env wasn't pre-populated
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^(?:EXPO_PUBLIC_)?GOOGLE_MAPS_API_KEY=(.*)$/m);
      if (match && match[1]) {
        return match[1].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {}

  return '';
}

module.exports = ({ config }) => {
  const apiKey = resolveApiKey();

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: apiKey || config.android?.config?.googleMaps?.apiKey || '',
        },
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMaps: {
          apiKey: apiKey || config.ios?.config?.googleMaps?.apiKey || '',
        },
      },
    },
    extra: {
      ...config.extra,
      googleMapsApiKey: apiKey,
    },
  };
};
