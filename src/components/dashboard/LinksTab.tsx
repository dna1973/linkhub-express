import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Trash2, ExternalLink, Instagram, Twitter, Youtube, Github, Globe, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Link {
  id: number;
  title: string;
  url: string;
  position: number;
  is_visible: boolean;
  clicks: number;
}

interface LinksTabProps {
  profile: any;
  onProfileUpdate: () => void;
}

const LINK_TYPES = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/seuusuario' },
  { id: 'twitter', label: 'Twitter', icon: Twitter, placeholder: 'https://twitter.com/seuusuario' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@seucanal' },
  { id: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/seuusuario' },
  { id: 'website', label: 'Website', icon: Globe, placeholder: 'https://seusite.com' },
  { id: 'email', label: 'Email', icon: Mail, placeholder: 'mailto:seu@email.com' },
];

export const LinksTab: React.FC<LinksTabProps> = ({ profile, onProfileUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedLinkType, setSelectedLinkType] = useState<any>(null);
  const [newLinkData, setNewLinkData] = useState({ title: '', url: '' });

  useEffect(() => {
    if (user) {
      loadLinks();
    }
  }, [user]);

  const loadLinks = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .order('position');

    if (!error && data) {
      setLinks(data);
    }
  };

  const handleAddLink = async () => {
    if (!user || !selectedLinkType || !newLinkData.title || !newLinkData.url) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const maxPosition = Math.max(...links.map(l => l.position), -1);
    
    const { error } = await supabase
      .from('links')
      .insert([{
        user_id: user.id,
        title: newLinkData.title,
        url: newLinkData.url,
        position: maxPosition + 1,
        is_visible: true,
        clicks: 0,
      }]);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar link.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Link adicionado!",
        description: "Seu novo link foi criado com sucesso.",
      });
      setShowAddDialog(false);
      setSelectedLinkType(null);
      setNewLinkData({ title: '', url: '' });
      loadLinks();
    }

    setLoading(false);
  };

  const handleDeleteLink = async (linkId: number) => {
    const { error } = await supabase
      .from('links')
      .delete()
      .eq('id', linkId);

    if (!error) {
      toast({
        title: "Link removido",
        description: "O link foi excluído com sucesso.",
      });
      loadLinks();
    }
  };

  const selectLinkType = (linkType: any) => {
    setSelectedLinkType(linkType);
    setNewLinkData({
      title: linkType.label,
      url: '',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Seus Links</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="btn-gradient-primary hover-bounce">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Link
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-sm border-border/50">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Link</DialogTitle>
            </DialogHeader>
            
            {!selectedLinkType ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Escolha o tipo de link que deseja adicionar:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {LINK_TYPES.map((linkType) => (
                    <Button
                      key={linkType.id}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center space-y-2 hover-bounce"
                      onClick={() => selectLinkType(linkType)}
                    >
                      <linkType.icon className="h-6 w-6" />
                      <span className="text-sm">{linkType.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-accent/20">
                  <selectedLinkType.icon className="h-5 w-5" />
                  <span className="font-medium">{selectedLinkType.label}</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Título</label>
                    <Input
                      value={newLinkData.title}
                      onChange={(e) => setNewLinkData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={`Meu ${selectedLinkType.label}`}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">URL</label>
                    <Input
                      value={newLinkData.url}
                      onChange={(e) => setNewLinkData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={selectedLinkType.placeholder}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedLinkType(null)}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleAddLink}
                    disabled={loading}
                    className="flex-1 btn-gradient-primary"
                  >
                    {loading ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {links.length === 0 ? (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-medium mb-2">Nenhum link ainda</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione seu primeiro link para começar a compartilhar suas redes sociais e websites.
            </p>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="btn-gradient-primary hover-bounce"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <Card key={link.id} className="bg-card/30 border-border/50 hover-bounce">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div>
                      <h4 className="font-medium">{link.title}</h4>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {link.url}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {link.clicks} cliques
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(link.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLink(link.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};