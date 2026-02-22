import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Trash2, ExternalLink, Instagram, Youtube, Github, Globe, Mail, Facebook, Linkedin, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isValidUrl, sanitizeText } from '@/utils/sanitize';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import googleDriveIcon from '@/assets/google-drive.png';
import notebookLmIcon from '@/assets/notebook-lm.svg';

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
  { id: 'x', label: 'X', icon: ExternalLink, placeholder: 'https://x.com/seuusuario' },
  { id: 'tiktok', label: 'TikTok', icon: ExternalLink, placeholder: 'https://tiktok.com/@seuusuario' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/seuusuario' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/seuusuario' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@seucanal' },
  { id: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/seuusuario' },
  { id: 'googledrive', label: 'Google Drive', icon: ({ className }: { className?: string }) => <img src={googleDriveIcon} alt="Google Drive" className={className} />, placeholder: 'https://drive.google.com/...' },
  { id: 'notebooklm', label: 'NotebookLM', icon: ({ className }: { className?: string }) => <img src={notebookLmIcon} alt="NotebookLM" className={className} />, placeholder: 'https://notebooklm.google.com/...' },
  { id: 'website', label: 'Website', icon: Globe, placeholder: 'https://seusite.com' },
  { id: 'email', label: 'Email', icon: Mail, placeholder: 'mailto:seu@email.com' },
];

interface SortableLinkProps {
  link: Link;
  onDelete: (id: number) => void;
  onEdit: (link: Link) => void;
}

const SortableLink: React.FC<SortableLinkProps> = ({ link, onDelete, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="bg-card/30 border-border/50 hover-bounce">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div
                {...listeners}
                className="cursor-move flex-shrink-0 p-2 -m-2 rounded-md active:bg-muted/50"
                style={{ touchAction: 'none' }}
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm sm:text-base truncate">{link.title}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {link.url}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                {link.clicks} cliques
              </Badge>
              <Badge variant="secondary" className="text-xs sm:hidden">
                {link.clicks}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(link)}
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(link.url, '_blank')}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(link.id)}
                className="text-destructive hover:text-destructive h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const LinksTab: React.FC<LinksTabProps> = ({ profile, onProfileUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [editLinkData, setEditLinkData] = useState({ title: '', url: '' });
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

    // Validate URL security
    if (!isValidUrl(newLinkData.url)) {
      toast({
        title: "URL inválida",
        description: "A URL fornecida não é válida. Use URLs com http:// ou https://.",
        variant: "destructive",
      });
      return;
    }

    const sanitizedTitle = sanitizeText(newLinkData.title, 100);

    setLoading(true);

    const maxPosition = Math.max(...links.map(l => l.position), -1);
    
    const { error } = await supabase
      .from('links')
      .insert([{
      user_id: user.id,
        title: sanitizedTitle,
        url: newLinkData.url.trim(),
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
      // Notificar outros componentes da mudança
      window.dispatchEvent(new CustomEvent('linksUpdated'));
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
      // Notificar outros componentes da mudança
      window.dispatchEvent(new CustomEvent('linksUpdated'));
    }
  };

  const handleEditLink = (link: Link) => {
    setEditingLink(link);
    setEditLinkData({ title: link.title, url: link.url });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLink || !editLinkData.title || !editLinkData.url) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(editLinkData.url)) {
      toast({
        title: "URL inválida",
        description: "A URL fornecida não é válida. Use URLs com http:// ou https://.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('links')
      .update({ title: sanitizeText(editLinkData.title, 100), url: editLinkData.url.trim() })
      .eq('id', editingLink.id);

    if (error) {
      toast({ title: "Erro", description: "Erro ao salvar alterações.", variant: "destructive" });
    } else {
      toast({ title: "Link atualizado!", description: "As alterações foram salvas." });
      setShowEditDialog(false);
      setEditingLink(null);
      loadLinks();
      window.dispatchEvent(new CustomEvent('linksUpdated'));
    }
    setLoading(false);
  };

  const selectLinkType = (linkType: any) => {
    setSelectedLinkType(linkType);
    setNewLinkData({
      title: linkType.label,
      url: '',
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = links.findIndex((link) => link.id === active.id);
      const newIndex = links.findIndex((link) => link.id === over?.id);

      const newLinks = arrayMove(links, oldIndex, newIndex);
      setLinks(newLinks);

      // Update positions in database
      const updates = newLinks.map((link, index) => ({
        id: link.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('links')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      // Notificar outros componentes da mudança
      window.dispatchEvent(new CustomEvent('linksUpdated'));

      toast({
        title: "Ordem atualizada",
        description: "A ordem dos links foi salva com sucesso.",
      });
    }
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
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3">
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

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-card/95 backdrop-blur-sm border-border/50">
          <DialogHeader>
            <DialogTitle>Editar Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={editLinkData.title}
                onChange={(e) => setEditLinkData(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input
                value={editLinkData.url}
                onChange={(e) => setEditLinkData(prev => ({ ...prev, url: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={loading} className="flex-1 btn-gradient-primary">
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={links.map(link => link.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {links.map((link) => (
                <SortableLink key={link.id} link={link} onDelete={handleDeleteLink} onEdit={handleEditLink} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};