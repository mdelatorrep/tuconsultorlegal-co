import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
const UTM_STORAGE_KEY = 'praxis_utm_params';
const UTM_SESSION_KEY = 'praxis_utm_session';

// Parámetros propietarios de plataformas de ads
const PLATFORM_DETECTION: { param: string; source: string; medium: string }[] = [
  { param: 'li_fat_id', source: 'linkedin', medium: 'paid_social' },
  { param: 'fbclid', source: 'facebook', medium: 'paid_social' },
  { param: 'gclid', source: 'google', medium: 'cpc' },
  { param: 'ttclid', source: 'tiktok', medium: 'paid_social' },
  { param: 'twclid', source: 'twitter', medium: 'paid_social' },
  { param: 'msclkid', source: 'bing', medium: 'cpc' },
];

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getStoredUTMs(): UTMParams | null {
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function getUTMSessionId(): string {
  try {
    let sessionId = sessionStorage.getItem(UTM_SESSION_KEY);
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem(UTM_SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return generateSessionId();
  }
}

export function clearStoredUTMs(): void {
  try {
    sessionStorage.removeItem(UTM_STORAGE_KEY);
  } catch {}
}

async function trackEvent(eventType: string, lawyerId?: string) {
  const utmParams = getStoredUTMs();
  if (!utmParams) return;

  try {
    await supabase.functions.invoke('utm-track-event', {
      body: {
        sessionId: getUTMSessionId(),
        utmParams,
        eventType,
        lawyerId,
        landingPage: window.location.pathname,
        referrer: document.referrer || null,
      },
    });
  } catch (error) {
    console.error('UTM tracking error:', error);
  }
}

export function useUTMTracking() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utmData: UTMParams = {};
    let hasUTM = false;

    for (const key of UTM_PARAMS) {
      const value = params.get(key);
      if (value) {
        utmData[key] = value;
        hasUTM = true;
      }
    }

    if (hasUTM) {
      try {
        sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));
      } catch {}
      // Track visit event
      trackEvent('visit');

      // Clean UTM params from URL without reload
      const url = new URL(window.location.href);
      UTM_PARAMS.forEach((key) => url.searchParams.delete(key));
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const trackSignup = useCallback((lawyerId: string) => {
    trackEvent('signup', lawyerId);
  }, []);

  const trackLogin = useCallback((lawyerId: string) => {
    trackEvent('login', lawyerId);
  }, []);

  return { trackSignup, trackLogin, getStoredUTMs };
}
