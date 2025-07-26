import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Instagram, Youtube, Twitter, Globe, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExampleProfile = () => {
  const navigate = useNavigate();

  const exampleLinks = [
    {
      id: 1,
      title: 'Instagram',
      url: '#',
      icon: Instagram,
      clicks: 245
    },
    {
      id: 2,
      title: 'YouTube',
      url: '#',
      icon: Youtube,
      clicks: 189
    },
    {
      id: 3,
      title: 'Twitter',
      url: '#',
      icon: Twitter,
      clicks: 156
    },
    {
      id: 4,
      title: 'Website',
      url: '#',
      icon: Globe,
      clicks: 98
    },
    {
      id: 5,
      title: 'Email',
      url: '#',
      icon: Mail,
      clicks: 67
    },
    {
      id: 6,
      title: 'Contato',
      url: '#',
      icon: Phone,
      clicks: 43
    }
  ];

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Simular clique sem navegar
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Mobile Device Frame */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative">
          {/* Device Frame */}
          <div className="w-[350px] h-[600px] bg-black rounded-[3rem] p-2 shadow-2xl">
            <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
              {/* Status Bar */}
              <div className="h-6 bg-black rounded-t-[2.5rem] flex items-center justify-center">
                <div className="w-20 h-1 bg-white rounded-full"></div>
              </div>
              
              {/* Profile Content */}
              <div className="h-[calc(100%-1.5rem)] bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex flex-col items-center text-white p-6 overflow-y-auto">
                {/* Profile Info */}
                <div className="text-center mb-8">
                  <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 mx-auto">
                    <span className="text-3xl font-bold">JD</span>
                  </div>
                  <h1 className="text-2xl font-bold mb-2">João Silva</h1>
                  <p className="text-white/80 text-sm leading-relaxed">
                    Creator de conteúdo | Designer | Desenvolvedor
                    <br />
                    Compartilhando conhecimento e inspiração ✨
                  </p>
                </div>

                {/* Links */}
                <div className="w-full space-y-4 flex-1">
                  {exampleLinks.map((link) => (
                    <button
                      key={link.id}
                      onClick={handleLinkClick}
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 hover:bg-white/20 transition-all duration-300 flex items-center space-x-4 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <link.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-white">{link.title}</div>
                        <div className="text-xs text-white/60">{link.clicks} cliques</div>
                      </div>
                      <div className="text-white/40 group-hover:text-white/60 transition-colors">
                        →
                      </div>
                    </button>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-white/20 text-center">
                  <p className="text-xs text-white/60">
                    Criado com ❤️ no LinkHub
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExampleProfile;