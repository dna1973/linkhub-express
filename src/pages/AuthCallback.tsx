import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    // Process hash fragments from email confirmation links
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          console.error('Error setting session:', error);
          navigate('/auth');
        } else {
          setProcessed(true);
        }
      });
    } else {
      setProcessed(true);
    }
  }, []);

  useEffect(() => {
    if (!processed) return;
    
    const timer = setTimeout(() => {
      if (!loading) {
        if (user) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/auth', { replace: true });
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [user, loading, processed, navigate]);

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