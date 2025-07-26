import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const AuthHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se há tokens na URL (callback do OAuth)
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Erro ao processar callback:', error);
        navigate('/auth');
        return;
      }

      if (data.session) {
        console.log('✅ Sessão encontrada, redirecionando para dashboard');
        navigate('/dashboard');
      }
    };

    // Verificar se estamos em uma URL de callback
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    if (hashParams.get('access_token') || urlParams.get('code')) {
      console.log('🔄 Processando callback OAuth...');
      handleAuthCallback();
    }
  }, [navigate]);

  return null; // Este componente não renderiza nada
};