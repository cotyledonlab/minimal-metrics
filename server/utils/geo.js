import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const countryMap = {
  'US': 'United States',
  'GB': 'United Kingdom',
  'DE': 'Germany',
  'FR': 'France',
  'CA': 'Canada',
  'AU': 'Australia',
  'JP': 'Japan',
  'CN': 'China',
  'IN': 'India',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'ES': 'Spain',
  'IT': 'Italy',
  'NL': 'Netherlands',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PL': 'Poland',
  'RU': 'Russia',
  'KR': 'South Korea',
  'SG': 'Singapore',
  'NZ': 'New Zealand',
  'IE': 'Ireland',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'BE': 'Belgium',
  'PT': 'Portugal',
  'GR': 'Greece',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'RO': 'Romania',
  'IL': 'Israel',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'ZA': 'South Africa',
  'EG': 'Egypt',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'PE': 'Peru',
  'VE': 'Venezuela',
  'MY': 'Malaysia',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'PH': 'Philippines',
  'ID': 'Indonesia',
  'TR': 'Turkey',
  'UA': 'Ukraine',
  'PK': 'Pakistan',
  'BD': 'Bangladesh'
};

function ipToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  
  return parts.reduce((acc, part, i) => {
    return acc + (parseInt(part) << ((3 - i) * 8));
  }, 0);
}

function parseCloudflareHeaders(headers) {
  if (headers['cf-ipcountry']) {
    const code = headers['cf-ipcountry'];
    return countryMap[code] || code;
  }
  return null;
}

function parseIpCountryHeader(headers) {
  if (headers['x-country-code']) {
    const code = headers['x-country-code'].toUpperCase();
    return countryMap[code] || code;
  }
  return null;
}

function getIpFromHeaders(headers) {
  return headers['x-forwarded-for']?.split(',')[0].trim() ||
         headers['x-real-ip'] ||
         headers['cf-connecting-ip'] ||
         null;
}

export function getCountryFromIp(ip, headers = {}) {
  const cloudflareCountry = parseCloudflareHeaders(headers);
  if (cloudflareCountry) return cloudflareCountry;
  
  const headerCountry = parseIpCountryHeader(headers);
  if (headerCountry) return headerCountry;
  
  if (!ip || ip === '::1' || ip === '127.0.0.1') {
    return 'Local';
  }
  
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return 'Private Network';
  }
  
  return 'Unknown';
}

export function extractIpInfo(req) {
  const headers = req.headers || {};
  const ip = getIpFromHeaders(headers) || req.socket?.remoteAddress;
  const country = getCountryFromIp(ip, headers);
  
  return { ip, country };
}