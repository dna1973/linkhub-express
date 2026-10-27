import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Trash2, ExternalLink, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LinkClicksDialog } from './LinkClicksDialog';
import { AddLinkDialog } from './links/AddLinkDialog';
import { EditLinkDialog } from './links/EditLinkDialog';
import { LinkIcon } from '@/components/links/LinkIcon';
import { LINK_ICONS_BUCKET, LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';
import { linkIconPathFromUrl } from '@/lib/linkIcons/storage';
import { formatClicks } from '@/lib/formatClicks';
import { useToast } from '@/hooks/use-toast';
import { isValidUrl, safeOpenUrl, sanitizeText } from '@/utils/sanitize';
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

interface Link {
  id: number;
  title: string;
  url: string;
  position: number;
  is_visible: boolean;
  clicks: number;
  icon_type: string;
  icon_value: string | null;
  accent_color: string | null;
}

interface LinksTabProps {
  profile: any;
  onProfileUpdate: () => void;
}

interface SortableLinkProps {
  link: Link;
  onDelete: (link: Link) => void;
  onEdit: (link: Link) => void;
  profileId: string;
}

const SortableLink: React.FC<SortableLinkProps> = ({ link, onDelete, onEdit, profileId }) => {
  const [showClicksDialog, setShowClicksDialog] = useState(false);
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
      {/* Card compacto: cabem mais links na tela; a alça de arrastar mantém área de toque maior que o ícone */}
      <Card className="bg-card border-border shadow-sm hover-bounce">
        <CardContent className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                {...listeners}
                className="cursor-move flex-shrink-0 p-1.5 -m-1.5 rounded-md active:bg-muted/50"
                style={{ touchAction: 'none' }}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              {/* Quadrado branco: os ícones pretos de marca aparecem também no tema escuro */}
              <div
                data-testid="link-icon-box"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border bg-white"
              >
                <LinkIcon link={link} size={18} defaultColor="#1f2937" backgrounds={['#ffffff']} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm truncate leading-tight">{link.title}</h4>
                <p className="text-xs text-muted-foreground truncate leading-tight">
                  {link.url}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-primary/20 transition-colors hidden sm:inline-flex"
                onClick={() => setShowClicksDialog(true)}
              >
                {formatClicks(link.clicks)}
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-primary/20 transition-colors sm:hidden"
                onClick={() => setShowClicksDialog(true)}
              >
                {link.clicks}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(link)}
                className="h-7 w-7 p-0"
                aria-label="Editar link"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => safeOpenUrl(link.url)}
                className="h-7 w-7 p-0"
                aria-label="Abrir link"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(link)}
                className="text-destructive hover:text-destructive h-7 w-7 p-0"
                aria-label="Excluir link"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <LinkClicksDialog
        open={showClicksDialog}
        onOpenChange={setShowClicksDialog}
        linkId={link.id}
        linkTitle={link.title}
        profileId={profileId}
      />
    </div>
  );
};

export const LinksTab: React.FC<LinksTabProps> = ({ profile, onProfileUpdate }) => {
  // Perfil atual: os links e a pasta dos ícones são dele (links.user_id guarda o id do perfil)
  const profileId: string | undefined = profile?.id;
  const { toast } = useToast();
  const [links, setLinks] = useState<Link[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);

  const fetchLinks = async (id: string): Promise<Link[] | null> => {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', id)
      .order('position');

    return !error && data ? data : null;
  };

  // Trocar de perfil descarta a resposta do anterior, que pode chegar depois
  useEffect(() => {
    if (!profileId) return;
    let active = true;
    fetchLinks(profileId).then((data) => {
      if (active && data) setLinks(data);
    });
    return () => {
      active = false;
    };
  }, [profileId]);

  const loadLinks = async () => {
    if (!profileId) return;
    const data = await fetchLinks(profileId);
    if (data) setLinks(data);
  };

  // O AddLinkDialog já validou a URL e decidiu o título (digitado ou automático)
  const handleAddLink = async (data: { title: string; url: string }): Promise<boolean> => {
    if (!profileId) return false;
    // Defesa: o diálogo já recusa, mas o insert não depende disso
    if (!isValidUrl(data.url)) return false;

    const sanitizedTitle = sanitizeText(data.title, 100);
    if (!sanitizedTitle) {
      toast({
        title: "Erro",
        description: "Informe um título.",
        variant: "destructive",
      });
      return false;
    }

    const maxPosition = Math.max(...links.map(l => l.position), -1);

    const { error } = await supabase
      .from('links')
      .insert([{
        user_id: profileId,
        title: sanitizedTitle,
        url: data.url.trim(),
        position: maxPosition + 1,
        is_visible: true,
        clicks: 0,
        icon_type: 'auto',
        icon_value: null,
        accent_color: null,
      }]);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar link.",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Link adicionado!",
      description: "Seu novo link foi criado com sucesso.",
    });
    loadLinks();
    // Notificar outros componentes da mudança
    window.dispatchEvent(new CustomEvent('linksUpdated'));
    return true;
  };

  const handleDeleteLink = async (link: Link) => {
    const { error } = await supabase
      .from('links')
      .delete()
      .eq('id', link.id);

    if (!error) {
      // Ícone enviado: apaga o arquivo depois do delete; a falha só vai para o console
      if (link.icon_type === 'upload' && profileId) {
        const path = linkIconPathFromUrl(link.icon_value, profileId, LINK_ICONS_PUBLIC_PREFIX);
        if (path) {
          try {
            const { error: removeError } = await supabase.storage.from(LINK_ICONS_BUCKET).remove([path]);
            if (removeError) console.error('Error removing link icon:', removeError);
          } catch (removeError) {
            console.error('Error removing link icon:', removeError);
          }
        }
      }
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
    setShowEditDialog(true);
  };

  // Cada gravação do modal de edição recarrega a lista e avisa a prévia
  const handleEditSaved = () => {
    loadLinks();
    window.dispatchEvent(new CustomEvent('linksUpdated'));
  };

  // O modal recebe a versão recarregada do link (o estado dele só reinicia quando o id muda)
  const editingLinkCurrent = editingLink ? links.find((l) => l.id === editingLink.id) ?? editingLink : null;

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
        <Button className="btn-gradient-primary hover-bounce" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Link
        </Button>
      </div>

      <AddLinkDialog open={showAddDialog} onOpenChange={setShowAddDialog} onAdd={handleAddLink} />

      <EditLinkDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        link={editingLinkCurrent}
        profileId={profileId ?? ''}
        onSaved={handleEditSaved}
      />

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
            <div className="space-y-2">
              {links.map((link) => (
                <SortableLink key={link.id} link={link} onDelete={handleDeleteLink} onEdit={handleEditLink} profileId={profileId ?? ''} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};