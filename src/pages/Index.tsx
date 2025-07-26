import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link, Sparkles, Zap, Palette, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Link,
      title: 'Links Ilimitados',
      description: 'Adicione quantos links quiser - redes sociais, websites, produtos e muito mais.',
    },
    {
      icon: Palette,
      title: 'Totalmente Personalizável',
      description: 'Escolha entre temas predefinidos ou crie seu próprio design único.',
    },
    {
      icon: Zap,
      title: 'Configuração Rápida',
      description: 'Fluxo intuitivo e guiado para adicionar links em segundos.',
    },
    {
      icon: BarChart3,
      title: 'Analytics Integrado',
      description: 'Acompanhe cliques e performance dos seus links em tempo real.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full btn-gradient-primary flex items-center justify-center">
              <Link className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold">LinkHub</h1>
          </div>
          
          <Button 
            onClick={() => navigate('/auth')}
            className="btn-gradient-primary hover-bounce"
          >
            Começar Grátis
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full btn-gradient-primary mb-8">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Sua página de links,
              <br />
              <span className="bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                do seu jeito
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Crie uma página personalizada para todos os seus links importantes. 
              Compartilhe suas redes sociais, websites e projetos em um só lugar, 
              com design profissional e analytics integrado.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="btn-gradient-primary hover-bounce text-lg px-8 py-6"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Criar Minha Página Grátis
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="text-lg px-8 py-6 hover-bounce"
              >
                Ver Exemplo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas para criar e gerenciar sua presença online
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="bg-card/50 backdrop-blur-sm border-border/50 hover-bounce animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Card className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-cyan-500/10 border-primary/20 max-w-4xl mx-auto">
            <CardContent className="p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Pronto para começar?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Junte-se a milhares de criadores que já usam o LinkHub para 
                compartilhar seu conteúdo de forma profissional.
              </p>
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="btn-gradient-primary hover-bounce text-lg px-8 py-6"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Começar Agora - É Grátis
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 rounded-full btn-gradient-primary flex items-center justify-center">
              <Link className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold">LinkHub</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2024 LinkHub. Feito com ❤️ para criadores de conteúdo.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
