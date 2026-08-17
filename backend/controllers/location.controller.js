/**
 * Server-Side IP Geolocation Controller
 * Resolves client IP to city level without requiring GPS or client-side reverse geocoding.
 * Uses native Node 18+ fetch with AbortController timeout.
 */

function getClientIp(req) {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '';
  if (typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip;
}

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function sanitizeCityName(rawCity) {
  if (!rawCity || typeof rawCity !== 'string') return '';
  let city = rawCity.trim();

  city = city.replace(/[\u0900-\u097F]+/g, '').trim();
  city = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  city = city.replace(/[^a-zA-Z0-9\s-]/g, '').trim();

  if (/^noida/i.test(city) || /greater noida/i.test(city)) return 'Noida';
  if (/new delhi/i.test(city)) return 'Delhi';
  if (/gurgaon/i.test(city)) return 'Gurugram';
  if (/bangalore/i.test(city)) return 'Bengaluru';

  if (!city || city.length < 2) return '';
  return city;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function detectLocation(req, res) {
  try {
    let clientIp = getClientIp(req);

    if (isPrivateIp(clientIp)) {
      try {
        const ipifyRes = await fetchWithTimeout('https://api.ipify.org?format=json', {}, 3000);
        if (ipifyRes.ok) {
          const data = await ipifyRes.json();
          if (data && data.ip) {
            clientIp = data.ip;
          }
        }
      } catch (e) {
        clientIp = '';
      }
    }

    // Provider 1: freeipapi.com
    try {
      const url = clientIp ? `https://freeipapi.com/api/json/${clientIp}` : 'https://freeipapi.com/api/json';
      const response = await fetchWithTimeout(url, { headers: { 'User-Agent': 'EVCorn-Backend/2.0' } }, 3500);
      if (response.ok) {
        const data = await response.json();
        if (data && data.cityName) {
          const city = sanitizeCityName(data.cityName);
          if (city) {
            return res.json({
              success: true,
              city: city,
              state: sanitizeCityName(data.regionName || ''),
              country: data.countryName || 'India',
              source: 'ip'
            });
          }
        }
      }
    } catch (e) {}

    // Provider 2: ip-api.com
    try {
      const url = clientIp
        ? `http://ip-api.com/json/${clientIp}?fields=status,message,country,regionName,city`
        : 'http://ip-api.com/json/?fields=status,message,country,regionName,city';
      const response = await fetchWithTimeout(url, { headers: { 'User-Agent': 'EVCorn-Backend/2.0' } }, 3500);
      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 'success' && data.city) {
          const city = sanitizeCityName(data.city);
          if (city) {
            return res.json({
              success: true,
              city: city,
              state: sanitizeCityName(data.regionName || ''),
              country: data.country || 'India',
              source: 'ip'
            });
          }
        }
      }
    } catch (e) {}

    // Provider 3: ipapi.co
    try {
      const url = clientIp ? `https://ipapi.co/${clientIp}/json/` : 'https://ipapi.co/json/';
      const response = await fetchWithTimeout(url, { headers: { 'User-Agent': 'EVCorn-Backend/2.0' } }, 3500);
      if (response.ok) {
        const data = await response.json();
        if (data && data.city) {
          const city = sanitizeCityName(data.city);
          if (city) {
            return res.json({
              success: true,
              city: city,
              state: sanitizeCityName(data.region || ''),
              country: data.country_name || 'India',
              source: 'ip'
            });
          }
        }
      }
    } catch (e) {}

    return res.json({
      success: false,
      city: 'Select city',
      state: '',
      country: 'India',
      source: 'fallback'
    });
  } catch (error) {
    return res.json({
      success: false,
      city: 'Select city',
      state: '',
      country: 'India',
      source: 'fallback'
    });
  }
}

module.exports = {
  detectLocation,
  sanitizeCityName
};
