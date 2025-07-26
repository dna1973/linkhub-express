// Configurações de ambiente
export const getBaseUrl = () => {
  // Usar variável de ambiente se definida
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }
  
  // Em produção, usar o domínio específico
  if (import.meta.env.PROD) {
    return 'https://linkhub.estudioai.site';
  }
  
  // Em desenvolvimento, usar localhost
  return 'http://localhost:5173';
};

export const getRedirectUrl = (path: string = '/dashboard') => {
  return `${getBaseUrl()}${path}`;
};

// URLs para diferentes ambientes
export const config = {
  development: {
    baseUrl: 'http://localhost:5173',
    dashboardUrl: 'http://localhost:5173/dashboard'
  },
  production: {
    baseUrl: 'https://linkhub.estudioai.site',
    dashboardUrl: 'https://linkhub.estudioai.site/dashboard'
  }
};

// Função para obter configuração atual
export const getCurrentConfig = () => {
  return import.meta.env.PROD ? config.production : config.development;
};