import axios from 'axios';

// In-memory cache for search & reverse geocoding queries
const cache = new Map();
const MAX_CACHE_SIZE = 500;

// Rate-limiting queue for Nominatim: 1 request per 1050ms
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1050;

const throttle = async () => {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_INTERVAL_MS) {
    const waitTime = MIN_INTERVAL_MS - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
};

const getBaseUrl = () => process.env.GEOCODER_BASE_URL || 'https://nominatim.openstreetmap.org';
const getUserAgent = () => process.env.GEOCODER_USER_AGENT || 'UrbanFix-Platform/1.0 (urbanfix@civictech.local)';

export const searchAddress = async (query) => {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `search:${query.trim().toLowerCase()}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  await throttle();

  try {
    const response = await axios.get(`${getBaseUrl()}/search`, {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: 5,
      },
      headers: {
        'User-Agent': getUserAgent(),
        'Accept-Language': 'en',
      },
      timeout: 6000,
    });

    const results = (response.data || []).map((item) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
    }));

    if (cache.size > MAX_CACHE_SIZE) cache.clear();
    cache.set(cacheKey, results);

    return results;
  } catch (err) {
    console.error('[Geocoder] Search error:', err.message);
    return [];
  }
};

export const reverseGeocode = async (lat, lng) => {
  if (lat == null || lng == null) return null;

  const latFixed = Number(lat).toFixed(4);
  const lngFixed = Number(lng).toFixed(4);
  const cacheKey = `reverse:${latFixed},${lngFixed}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  await throttle();

  try {
    const response = await axios.get(`${getBaseUrl()}/reverse`, {
      params: {
        lat: Number(lat),
        lon: Number(lng),
        format: 'json',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': getUserAgent(),
        'Accept-Language': 'en',
      },
      timeout: 6000,
    });

    const result = {
      displayName: response.data?.display_name || `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
      address: response.data?.address || {},
      lat: parseFloat(response.data?.lat || lat),
      lng: parseFloat(response.data?.lon || lng),
    };

    if (cache.size > MAX_CACHE_SIZE) cache.clear();
    cache.set(cacheKey, result);

    return result;
  } catch (err) {
    console.error('[Geocoder] Reverse error:', err.message);
    return {
      displayName: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
      lat: Number(lat),
      lng: Number(lng),
    };
  }
};
