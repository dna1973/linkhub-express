/**
 * Security utilities for input validation and sanitization
 * LGPD & OWASP compliant
 */

// Block dangerous URL protocols
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:'];

/**
 * Validates a URL to prevent XSS via javascript: protocol and other attacks
 */
export const isValidUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (trimmed.startsWith(protocol)) return false;
  }
  
  // Allow mailto: links
  if (trimmed.startsWith('mailto:')) return true;
  
  // Allow tel: links
  if (trimmed.startsWith('tel:')) return true;
  
  // Must be http/https or a domain-like string
  try {
    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Sanitizes a string to prevent XSS - strips HTML tags
 */
export const sanitizeText = (text: string, maxLength: number = 500): string => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
    .slice(0, maxLength);
};

/**
 * Sanitizes a username
 */
export const sanitizeUsername = (username: string): string => {
  if (!username || typeof username !== 'string') return '';
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
};

/**
 * Safely open a URL in a new tab with security attributes
 */
export const safeOpenUrl = (url: string): void => {
  if (!isValidUrl(url)) return;
  
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url) || url.startsWith('mailto:');
  
  if (isEmail) {
    window.location.href = url.startsWith('mailto:') ? url : `mailto:${url}`;
  } else {
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    // Use noopener and noreferrer for security
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  }
};
