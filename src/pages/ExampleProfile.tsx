import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Instagram, Youtube, Globe, Linkedin, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import exampleAvatar from '@/assets/example-avatar.jpg';
import googleDriveIcon from '@/assets/google-drive.png';
import notebookLmIcon from '@/assets/notebook-lm.svg';

const ExampleProfile = () => {
  const navigate = useNavigate();

  const exampleLinks = [
    { id: 1, title: 'Manutenção Predial', icon: Globe },
    { id: 2, title: 'SIMP - NotebookLM', icon: ({ className }: { className?: string }) => <img src={notebookLmIcon} alt="NotebookLM" className={className} /> },
    { id: 3, title: 'Gestão de Imóveis', icon: Globe },
    { id: 4, title: 'LinkedIn', icon: Linkedin },
    { id: 5, title: 'YouTube', icon: Youtube },
    { id: 6, title: 'Google Drive', icon: ({ className }: { className?: string }) => <img src={googleDriveIcon} alt="Google Drive" className={className} /> },
  ];

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Theme: Pebble Blue (default)
  const bg = 'linear-gradient(135deg, #1e3a8a, #3730a3)';
  const textColor = '#ffffff';
  const btnBg = 'rgba(255,255,255,0.1)';
  const btnBorder = 'rgba(255,255,255,0.2)';
  const avatarBorderColor = '#f59e0b';

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
        <div className="relative w-full max-w-[400px] mx-auto">
          {/* Samsung S24 Ultra Device Frame */}
          <div className="w-full aspect-[400/820] max-h-[90vh] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.2rem] sm:rounded-[2.2rem] rounded-[1.5rem] p-[3px] shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
            <div className="w-full h-full bg-black rounded-[2rem] p-[2px]">
              <div className="w-full h-full rounded-[1.9rem] overflow-hidden relative">
                {/* Status Bar */}
                <div className="h-7 flex items-center justify-between px-6 relative" style={{ background: bg }}>
                  <span className="text-white text-[10px] font-medium">12:30</span>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-black/40 rounded-full" />
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-2 border border-white/60 rounded-sm relative">
                      <div className="absolute inset-[1px] bg-white/60 rounded-[1px]" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>
                
                {/* Profile Content - matching PublicProfile layout */}
                <div 
                  className="h-[calc(100%-1.75rem)] flex flex-col items-center p-6 overflow-y-auto"
                  style={{ background: bg }}
                >
                  <div className="w-full max-w-sm mx-auto flex flex-col flex-1">
                    {/* Profile Section */}
                    <div className="text-center mb-6">
                      <div 
                        className="w-24 h-24 rounded-full overflow-hidden mb-4 mx-auto"
                        style={{ border: `4px solid ${avatarBorderColor}` }}
                      >
                        <img src={exampleAvatar} alt="João Silva" className="w-full h-full object-cover" />
                      </div>
                      <h1 className="text-xl font-bold mb-1" style={{ color: textColor }}>
                        João Silva
                      </h1>
                      <p className="text-sm opacity-80 mb-2" style={{ color: textColor }}>
                        joao.silva@email.com
                      </p>
                    </div>

                    {/* Links Section - matching PublicProfile button style */}
                    <div className="space-y-3 mb-6 flex-1">
                      {exampleLinks.map((link) => (
                        <button
                          key={link.id}
                          onClick={handleLinkClick}
                          className="w-full h-14 rounded-lg flex items-center justify-center space-x-3 transition-all duration-200 hover:scale-[1.02] backdrop-blur-sm"
                          style={{ 
                            backgroundColor: btnBg, 
                            border: `1px solid ${btnBorder}`,
                            color: textColor
                          }}
                        >
                          <link.icon className="h-5 w-5" />
                          <span className="font-medium text-sm">{link.title}</span>
                        </button>
                      ))}
                    </div>

                    {/* Footer - matching PublicProfile */}
                    <div className="text-center mt-auto pt-4">
                      <button
                        className="rounded-full px-5 py-2 border-2 opacity-70 hover:opacity-100 bg-transparent transition-all duration-200 mb-2 text-xs"
                        style={{ 
                          color: textColor,
                          borderColor: `${textColor}50`
                        }}
                      >
                        👉 Clique aqui para criar seu LinkHub
                      </button>
                      <p className="text-[10px] opacity-40" style={{ color: textColor }}>
                        Powered by LinkHub
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom navigation bar indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExampleProfile;