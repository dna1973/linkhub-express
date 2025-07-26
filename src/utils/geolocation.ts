interface GeolocationData {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
}

interface GeolocationResponse {
  country_name?: string;
  country_code?: string;
  city?: string;
  region?: string;
}

// Cache para evitar múltiplas chamadas da mesma sessão
const geoCache = new Map<string, GeolocationData>();

// Função para gerar ID de sessão único
export const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Função para detectar tipo de dispositivo
export const getDeviceType = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/tablet|ipad/.test(userAgent)) {
    return 'tablet';
  } else if (/mobile|android|iphone/.test(userAgent)) {
    return 'mobile';
  } else {
    return 'desktop';
  }
};

// Função principal para obter dados de geolocalização
export const getGeolocationData = async (): Promise<GeolocationData> => {
  const cacheKey = 'user-geo';
  
  // Verificar cache primeiro
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey)!;
  }

  // Verificar localStorage para cache persistente
  const cachedData = localStorage.getItem('geo-cache');
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      const cacheAge = Date.now() - parsed.timestamp;
      
      // Cache válido por 1 hora
      if (cacheAge < 60 * 60 * 1000) {
        const geoData = parsed.data;
        geoCache.set(cacheKey, geoData);
        return geoData;
      }
    } catch (error) {
      console.warn('Error parsing geo cache:', error);
    }
  }

  // Tentar múltiplas APIs de geolocalização
  const geoApis = [
    {
      url: 'https://ipapi.co/json/',
      parser: (data: any): GeolocationData => ({
        country: data.country_name || null,
        countryCode: data.country_code || null,
        city: data.city || null,
        region: data.region || null
      })
    },
    {
      url: 'https://api.ipify.org?format=json',
      parser: async (data: any): Promise<GeolocationData> => {
        // Fallback: usar apenas IP para obter país via outra API
        try {
          const response = await fetch(`https://ipapi.co/${data.ip}/json/`);
          if (response.ok) {
            const geoData = await response.json();
            return {
              country: geoData.country_name || null,
              countryCode: geoData.country_code || null,
              city: geoData.city || null,
              region: geoData.region || null
            };
          }
        } catch (error) {
          console.warn('Fallback geo API failed:', error);
        }
        
        return {
          country: null,
          countryCode: null,
          city: null,
          region: null
        };
      }
    }
  ];

  // Tentar cada API até conseguir dados
  for (const api of geoApis) {
    try {
      const response = await fetch(api.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Timeout de 5 segundos
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        const geoData = await api.parser(data);
        
        // Se conseguiu dados válidos, cachear e retornar
        if (geoData.country || geoData.countryCode) {
          geoCache.set(cacheKey, geoData);
          
          // Salvar no localStorage
          localStorage.setItem('geo-cache', JSON.stringify({
            data: geoData,
            timestamp: Date.now()
          }));
          
          return geoData;
        }
      }
    } catch (error) {
      console.warn(`Geo API failed: ${api.url}`, error);
      continue;
    }
  }

  // Se todas as APIs falharam, retornar dados vazios
  const fallbackData: GeolocationData = {
    country: null,
    countryCode: null,
    city: null,
    region: null
  };

  geoCache.set(cacheKey, fallbackData);
  return fallbackData;
};

// Função para normalizar nome do país
export const normalizeCountryName = (countryName: string | null): string | null => {
  if (!countryName) return null;
  
  // Mapeamento de nomes comuns para códigos ISO
  const countryMapping: Record<string, string> = {
    'brazil': 'BR',
    'brasil': 'BR',
    'united states': 'US',
    'estados unidos': 'US',
    'usa': 'US',
    'united kingdom': 'GB',
    'reino unido': 'GB',
    'uk': 'GB',
    'germany': 'DE',
    'alemanha': 'DE',
    'france': 'FR',
    'frança': 'FR',
    'italy': 'IT',
    'itália': 'IT',
    'spain': 'ES',
    'espanha': 'ES',
    'portugal': 'PT',
    'canada': 'CA',
    'canadá': 'CA',
    'mexico': 'MX',
    'méxico': 'MX',
    'argentina': 'AR',
    'chile': 'CL',
    'colombia': 'CO',
    'colômbia': 'CO',
    'peru': 'PE',
    'japan': 'JP',
    'japão': 'JP',
    'china': 'CN',
    'india': 'IN',
    'índia': 'IN',
    'australia': 'AU',
    'austrália': 'AU',
    'russia': 'RU',
    'rússia': 'RU',
    'south africa': 'ZA',
    'áfrica do sul': 'ZA'
  };

  const normalized = countryName.toLowerCase().trim();
  return countryMapping[normalized] || countryName;
};

// Função para obter sessão do usuário (persistente durante a visita)
export const getOrCreateSessionId = (): string => {
  let sessionId = sessionStorage.getItem('linkhub-session-id');
  
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('linkhub-session-id', sessionId);
  }
  
  return sessionId;
};