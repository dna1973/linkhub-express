import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('🔄 AuthCallback - Estado:', { user: !!user, loading });
    
    // Aguardar um momento para garantir que o auth state foi processado
    const timer = setTimeout(() => {
      if (!loading) {
        if (user) {
          console.log('✅ Usuário autenticado, redirecionando para dashboard');
          window.location.href = '/dashboard';
        } else {
          console.log('❌ Usuário não autenticado, redirecionando para auth');
          window.location.href = '/auth';
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <h2 className="text-lg font-semibold mb-2">Finalizando login...</h2>
          <p className="text-sm text-muted-foreground text-center">
            Aguarde enquanto processamos sua autenticação.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;