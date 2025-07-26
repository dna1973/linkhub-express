// Utilitários de debug para autenticação
export const debugAuth = {
  // Verificar configurações do Supabase
  checkSupabaseConfig: () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔍 Configurações do Supabase:', {
      url: url ? '✅ Configurada' : '❌ Não configurada',
      key: key ? '✅ Configurada' : '❌ Não configurada',
      urlValue: url,
      keyPreview: key ? `${key.substring(0, 20)}...` : 'Não definida'
    });
    
    return { url: !!url, key: !!key };
  },

  // Verificar URLs de redirecionamento
  checkRedirectUrls: () => {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const isDev = import.meta.env.DEV;
    const isProd = import.meta.env.PROD;
    
    console.log('🔍 URLs de redirecionamento:', {
      baseUrl,
      dashboardUrl: `${baseUrl}/dashboard`,
      environment: isDev ? 'development' : isProd ? 'production' : 'unknown',
      currentOrigin: window.location.origin
    });
    
    return {
      baseUrl,
      dashboardUrl: `${baseUrl}/dashboard`,
      environment: isDev ? 'development' : 'production'
    };
  },

  // Verificar se popups estão bloqueados
  checkPopupBlocked: () => {
    try {
      const popup = window.open('', '_blank', 'width=1,height=1');
      if (popup) {
        popup.close();
        console.log('✅ Popups permitidos');
        return false;
      } else {
        console.log('❌ Popups bloqueados');
        return true;
      }
    } catch (e) {
      console.log('❌ Erro ao verificar popups:', e);
      return true;
    }
  },

  // Log completo de debug
  fullDebug: () => {
    console.log('🐛 === DEBUG AUTH ===');
    debugAuth.checkSupabaseConfig();
    debugAuth.checkRedirectUrls();
    const popupBlocked = debugAuth.checkPopupBlocked();
    
    if (popupBlocked) {
      console.log('⚠️ ATENÇÃO: Popups estão bloqueados. Isso pode causar problemas no login social.');
    }
    
    console.log('🐛 === FIM DEBUG ===');
  }
};

// Executar debug automaticamente em desenvolvimento
if (import.meta.env.DEV) {
  // Aguardar um pouco para não interferir com o carregamento inicial
  setTimeout(() => {
    debugAuth.fullDebug();
  }, 1000);
}