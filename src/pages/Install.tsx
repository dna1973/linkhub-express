import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Smartphone, Share, Plus, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <Download className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold">App já instalado!</h1>
            <p className="text-muted-foreground">
              O LinkHub já está instalado no seu dispositivo.
            </p>
            <Button onClick={() => navigate('/')} className="btn-gradient-primary w-full">
              Abrir App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <BrandLogo size={80} className="mx-auto shadow-lg" />
          <h1 className="text-3xl font-bold">Instalar LinkHub</h1>
          <p className="text-muted-foreground">
            Tenha acesso rápido ao LinkHub direto na tela inicial do seu dispositivo.
          </p>
        </div>

        {/* Benefits */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <Smartphone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Acesso instantâneo</h3>
                <p className="text-sm text-muted-foreground">Abra o app direto da tela inicial, sem precisar do navegador.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Download className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Funciona offline</h3>
                <p className="text-sm text-muted-foreground">Acesse seu perfil mesmo sem conexão com internet.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Install Action */}
        {deferredPrompt ? (
          <Button 
            onClick={handleInstall} 
            className="w-full btn-gradient-primary hover-bounce text-lg py-6"
            size="lg"
          >
            <Download className="h-5 w-5 mr-2" />
            Instalar Agora
          </Button>
        ) : isIOS ? (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-center">Como instalar no iPhone/iPad:</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold">1</span>
                  </div>
                  <p className="text-sm">
                    Toque no ícone <Share className="h-4 w-4 inline" /> <strong>Compartilhar</strong> na barra do Safari
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold">2</span>
                  </div>
                  <p className="text-sm">
                    Role e toque em <Plus className="h-4 w-4 inline" /> <strong>Adicionar à Tela de Início</strong>
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold">3</span>
                  </div>
                  <p className="text-sm">
                    Toque em <strong>Adicionar</strong> para confirmar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Use o menu do navegador <ArrowRight className="h-4 w-4 inline" /> <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>
              </p>
            </CardContent>
          </Card>
        )}

        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="w-full"
        >
          Continuar no navegador
        </Button>
      </div>
    </div>
  );
};

export default Install;
