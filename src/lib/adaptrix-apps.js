// Adaptrix Platform Apps Configuration
// Fetches from central config at Adaptrix

// Central config URL - all apps fetch from Adaptrix
export const APPS_CONFIG_URL = 'https://adaptrix.href.co.uk/api/apps-config';

// Fallback config if fetch fails
export const FALLBACK_APPS = [
  {
    id: 'adaptrix',
    name: 'Adaptrix',
    description: 'Platform Hub',
    url: 'https://adaptrix.href.co.uk',
    icon: 'grid-3x3',
    color: '#3b82f6',
    status: 'production',
  },
  {
    id: 'crawlorix',
    name: 'Crawlorix',
    description: 'Web Crawler',
    url: 'https://crawlorix.href.co.uk',
    icon: 'globe',
    color: '#3b82f6',
    status: 'dev',
  },
];

// Fetch apps from central config
export async function fetchAppsConfig() {
  try {
    const res = await fetch(APPS_CONFIG_URL);
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json();
  } catch (error) {
    console.warn('Failed to fetch apps config, using fallback:', error);
    return FALLBACK_APPS;
  }
}
