# API e Integrações

## Visão Geral

Documentação completa da API do LinkHub e suas integrações com serviços externos.

## Supabase API

### Autenticação

#### Endpoints de Auth
```typescript
// Login com email/senha
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Login social (Google/GitHub)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google', // ou 'github'
  options: {
    redirectTo: 'http://localhost:5173/dashboard'
  }
});

// Registro
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
});

// Logout
const { error } = await supabase.auth.signOut();

// Verificar sessão atual
const { data: { session } } = await supabase.auth.getSession();

// Listener para mudanças de auth
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session.user);
  }
  if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  }
});
```

### Database Operations

#### Profiles
```typescript
// Buscar perfil
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Atualizar perfil
const { data, error } = await supabase
  .from('profiles')
  .update({ 
    full_name: 'Nome Completo',
    bio: 'Minha bio'
  })
  .eq('id', userId);
```

#### Links
```typescript
// Listar links
const { data: links } = await supabase
  .from('links')
  .select('*')
  .eq('profile_id', profileId)
  .order('position');

// Criar link
const { data, error } = await supabase
  .from('links')
  .insert({
    profile_id: profileId,
    title: 'Meu Link',
    url: 'https://example.com',
    position: 1
  });

// Atualizar link
const { data, error } = await supabase
  .from('links')
  .update({ title: 'Novo Título' })
  .eq('id', linkId);

// Deletar link
const { error } = await supabase
  .from('links')
  .delete()
  .eq('id', linkId);
```

#### Analytics
```typescript
// Registrar evento
const { error } = await supabase
  .from('analytics_events')
  .insert({
    profile_id: profileId,
    link_id: linkId,
    event_type: 'click',
    metadata: {
      userAgent: navigator.userAgent,
      referrer: document.referrer
    }
  });

// Buscar métricas
const { data: metrics } = await supabase
  .from('analytics_events')
  .select('*')
  .eq('profile_id', profileId)
  .gte('created_at', startDate)
  .lte('created_at', endDate);
```

## Edge Functions

### Analytics Aggregation
```typescript
// supabase/functions/analytics-aggregate/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { profileId, period } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Agregar dados de analytics
  const { data: events } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('profile_id', profileId)
    .gte('created_at', getStartDate(period));

  const aggregated = processAnalyticsData(events);
  
  return new Response(JSON.stringify(aggregated), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Report Generation
```typescript
// supabase/functions/generate-report/index.ts
serve(async (req) => {
  const { profileId, reportType, format } = await req.json();
  
  const data = await fetchReportData(profileId, reportType);
  
  if (format === 'pdf') {
    const pdfBuffer = await generatePDF(data);
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"'
      }
    });
  }
  
  return new Response(JSON.stringify(data));
});
```

## Integrações Externas

### Google Analytics
```typescript
// lib/integrations/google-analytics.ts
export class GoogleAnalyticsIntegration {
  private ga: any;

  constructor(trackingId: string) {
    // Inicializar GA
    gtag('config', trackingId);
  }

  trackEvent(eventName: string, parameters: any) {
    gtag('event', eventName, parameters);
  }

  trackPageView(path: string) {
    gtag('config', this.trackingId, {
      page_path: path
    });
  }
}
```

### Social Media APIs

#### Instagram Basic Display API
```typescript
// lib/integrations/instagram.ts
export class InstagramIntegration {
  private accessToken: string;

  async getUserMedia() {
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp&access_token=${this.accessToken}`
    );
    return response.json();
  }

  async getMediaInsights(mediaId: string) {
    const response = await fetch(
      `https://graph.instagram.com/${mediaId}/insights?metric=impressions,reach,engagement&access_token=${this.accessToken}`
    );
    return response.json();
  }
}
```

#### Twitter API v2
```typescript
// lib/integrations/twitter.ts
export class TwitterIntegration {
  private bearerToken: string;

  async getUserTweets(userId: string) {
    const response = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?tweet.fields=public_metrics,created_at`,
      {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`
        }
      }
    );
    return response.json();
  }

  async getTweetMetrics(tweetId: string) {
    const response = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
      {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`
        }
      }
    );
    return response.json();
  }
}
```

## Webhooks

### Configuração de Webhooks
```typescript
// lib/webhooks/handler.ts
export const handleWebhook = async (req: Request) => {
  const signature = req.headers.get('x-webhook-signature');
  const body = await req.text();
  
  // Verificar assinatura
  if (!verifySignature(body, signature)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const payload = JSON.parse(body);
  
  switch (payload.type) {
    case 'profile.updated':
      await handleProfileUpdate(payload.data);
      break;
    case 'link.clicked':
      await handleLinkClick(payload.data);
      break;
    default:
      console.log('Unknown webhook type:', payload.type);
  }
  
  return new Response('OK');
};
```

### Webhook Events
```typescript
interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
}

// Tipos de eventos
type WebhookEventType = 
  | 'profile.created'
  | 'profile.updated'
  | 'profile.deleted'
  | 'link.created'
  | 'link.updated'
  | 'link.deleted'
  | 'link.clicked'
  | 'analytics.milestone';
```

## Rate Limiting

### Implementação
```typescript
// lib/rate-limit.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const rateLimit = async (
  identifier: string,
  limit: number = 100,
  window: number = 3600 // 1 hora
) => {
  const key = `rate_limit:${identifier}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, window);
  }
  
  return {
    success: current <= limit,
    remaining: Math.max(0, limit - current),
    reset: Date.now() + (window * 1000)
  };
};
```

## Caching

### Redis Cache
```typescript
// lib/cache.ts
export class CacheManager {
  private redis: Redis;

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl: number = 3600) {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Uso
const cache = new CacheManager();

// Cache de perfil
const cacheKey = `profile:${profileId}`;
let profile = await cache.get(cacheKey);

if (!profile) {
  profile = await fetchProfileFromDB(profileId);
  await cache.set(cacheKey, profile, 1800); // 30 min
}
```

## Monitoramento

### Health Checks
```typescript
// api/health.ts
export const healthCheck = async () => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    storage: await checkStorage(),
    external_apis: await checkExternalAPIs()
  };

  const isHealthy = Object.values(checks).every(check => check.status === 'ok');

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks
  };
};

const checkDatabase = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    return { status: 'ok', response_time: Date.now() };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
};
```

### Logging
```typescript
// lib/logger.ts
export class Logger {
  static info(message: string, meta?: any) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      meta,
      timestamp: new Date().toISOString()
    }));
  }

  static error(message: string, error?: Error, meta?: any) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      meta,
      timestamp: new Date().toISOString()
    }));
  }

  static warn(message: string, meta?: any) {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      meta,
      timestamp: new Date().toISOString()
    }));
  }
}
```

## Segurança

### API Key Management
```typescript
// lib/auth/api-keys.ts
export const generateApiKey = () => {
  return `lh_${crypto.randomUUID().replace(/-/g, '')}`;
};

export const validateApiKey = async (apiKey: string) => {
  const { data } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key', apiKey)
    .eq('is_active', true)
    .single();

  return data;
};
```

### CORS Configuration
```typescript
// lib/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400'
};
```

## Documentação da API

### OpenAPI Specification
```yaml
# api-docs.yaml
openapi: 3.0.0
info:
  title: LinkHub API
  version: 1.0.0
  description: API para gerenciamento de links e analytics

paths:
  /api/profiles/{id}:
    get:
      summary: Buscar perfil
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Perfil encontrado
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Profile'

  /api/links:
    post:
      summary: Criar link
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateLink'
      responses:
        201:
          description: Link criado

components:
  schemas:
    Profile:
      type: object
      properties:
        id:
          type: string
        username:
          type: string
        full_name:
          type: string
        bio:
          type: string
        avatar_url:
          type: string
```

Esta documentação fornece uma base sólida para integração e desenvolvimento de funcionalidades avançadas no LinkHub.