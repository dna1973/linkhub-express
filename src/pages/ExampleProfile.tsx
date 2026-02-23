import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Instagram, Youtube, Twitter, Globe, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import exampleAvatar from '@/assets/example-avatar.jpg';

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
          {/* Samsung S24 Ultra Device Frame */}
          <div className="w-[400px] h-[820px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.2rem] p-[3px] shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
            {/* Inner bezel */}
            <div className="w-full h-full bg-black rounded-[2rem] p-[2px]">
              <div className="w-full h-full bg-white rounded-[1.9rem] overflow-hidden relative">
                {/* Status Bar with camera punch-hole */}
                <div className="h-7 bg-black flex items-center justify-between px-6 relative">
                  <span className="text-white text-[10px] font-medium">12:30</span>
                  {/* Camera punch-hole */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gray-900 rounded-full border border-gray-700" />
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-2 border border-white/60 rounded-sm relative">
                      <div className="absolute inset-[1px] bg-white/60 rounded-[1px]" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>
                
                {/* Profile Content */}
                <div className="h-[calc(100%-1.75rem)] flex flex-col items-center text-white p-8 overflow-y-auto" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}>
                  {/* Profile Info */}
                  <div className="text-center mb-10">
                    <div className="w-28 h-28 rounded-full overflow-hidden mb-5 mx-auto shadow-lg" style={{ border: '3px solid rgba(254, 243, 199, 0.5)' }}>
                      <img src={exampleAvatar} alt="João Silva" className="w-full h-full object-cover" />
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
                        className="w-full backdrop-blur-sm rounded-full p-4 hover:bg-white/20 transition-all duration-300 flex items-center space-x-4 group"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(254, 243, 199, 0.3)' }}
                      >
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(251, 191, 36, 0.25)' }}>
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

                {/* Bottom navigation bar indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-black/30 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExampleProfile;