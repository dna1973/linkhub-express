import React, { useEffect, useId, useRef, useState } from 'react';
import { ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { getPublicProfileUrl } from '@/lib/publicProfileUrl';
import { useToast } from '@/hooks/use-toast';
import { MAX_PROFILES, useCurrentProfile, type DeleteProfileResult, type Profile } from '@/contexts/CurrentProfileContext';

const DAY_MS = 24 * 60 * 60 * 1000;
const numberFormat = new Intl.NumberFormat('pt-BR');

interface ProfilesTabProps {
  /** Depois de "Abrir": o perfil já está selecionado; o Dashboard vai para a aba Links. */
  onOpenLinks: () => void;
  onCreateProfile: () => void;
}

type Stats = { views: number | null; clicks: number | null };

/** Perfil sem nome, no card e no diálogo de exclusão. */
export const UNNAMED_PROFILE = 'Perfil sem nome';
/** O que se digita para excluir um perfil sem @ e sem nome. */
const CONFIRM_WORD = 'excluir';

/** "@dna" ou, para perfil sem @, o nome. */
const labelOf = (profile: Profile) => (profile.username ? `@${profile.username}` : profile.full_name?.trim() || UNNAMED_PROFILE);

/** O que confirma a exclusão: o @ (com ou sem a arroba), o nome (perfil sem @) ou "excluir" (sem @ e sem nome). */
export function confirmationMatches(profile: Pick<Profile, 'username' | 'full_name'>, typed: string): boolean {
  const value = typed.trim();
  if (profile.username) return value.replace(/^@/, '') === profile.username;
  const name = (profile.full_name || '').trim();
  return value === (name || CONFIRM_WORD);
}

function confirmationHint(profile: Profile): string {
  if (profile.username) return `Para confirmar, digite @${profile.username}`;
  const name = (profile.full_name || '').trim();
  return name ? `Para confirmar, digite o nome do perfil: ${name}` : `Para confirmar, digite ${CONFIRM_WORD}`;
}

const LOAD_ERROR = 'Não foi possível carregar';

/** Visitas e cliques dos últimos 30 dias: contagem head, duas consultas por perfil (até 10 perfis). */
function useLast30Days(profileId: string): Stats | null {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
    Promise.all([
      supabase
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('viewed_at', since),
      supabase
        .from('link_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('clicked_at', since),
    ])
      .then(([views, clicks]) => {
        if (!active) return;
        if (views.error) console.error('Error counting profile views:', views.error);
        if (clicks.error) console.error('Error counting link clicks:', clicks.error);
        setStats({
          views: views.error ? null : views.count ?? 0,
          clicks: clicks.error ? null : clicks.count ?? 0,
        });
      })
      .catch((error) => {
        console.error('Error loading profile stats:', error);
        if (active) setStats({ views: null, clicks: null });
      });
    return () => {
      active = false;
    };
  }, [profileId]);

  return stats;
}

interface ProfileCardProps {
  profile: Profile;
  isCurrent: boolean;
  isOnly: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

function ProfileCard({ profile, isCurrent, isOnly, onOpen, onDelete }: ProfileCardProps) {
  const stats = useLast30Days(profile.id);
  const publicUrl = getPublicProfileUrl(profile);
  const label = labelOf(profile);
  const onlyHintId = useId();
  // Carregando: reticências; erro: travessão, explicado no aria-label e no title
  const show = (value: number | null | undefined) =>
    stats === null ? '…' : value === null || value === undefined ? '—' : numberFormat.format(value);
  const errorProps = (value: number | null | undefined) =>
    stats !== null && (value === null || value === undefined) ? { 'aria-label': LOAD_ERROR, title: LOAD_ERROR } : {};

  return (
    <Card data-testid="profile-card" className={isCurrent ? 'border-primary' : undefined}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
            <AvatarFallback>{(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {profile.full_name?.trim() || UNNAMED_PROFILE}
              {isCurrent && <span className="ml-2 text-xs font-normal text-primary">atual</span>}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {profile.username ? `@${profile.username}` : 'Sem @username'}
            </p>
            {publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 text-xs text-primary hover:underline"
              >
                <span className="truncate">{publicUrl}</span>
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">Sem link público até definir o @username</p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-muted/50 p-2">
            <dt className="text-xs text-muted-foreground">Visitas (30 dias)</dt>
            <dd className="font-semibold" data-testid="profile-views" {...errorProps(stats?.views)}>
              {show(stats?.views)}
            </dd>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <dt className="text-xs text-muted-foreground">Cliques (30 dias)</dt>
            <dd className="font-semibold" data-testid="profile-clicks" {...errorProps(stats?.clicks)}>
              {show(stats?.clicks)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onOpen} aria-label={`Abrir ${label}`}>
            Abrir
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={isOnly}
            onClick={onDelete}
            aria-label={`Excluir ${label}`}
            aria-describedby={isOnly ? onlyHintId : undefined}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Excluir
          </Button>
        </div>
        {isOnly && (
          <p id={onlyHintId} className="text-xs text-muted-foreground">
            Este é o seu único perfil. Para excluí-lo, crie outro antes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export const ProfilesTab: React.FC<ProfilesTabProps> = ({ onOpenLinks, onCreateProfile }) => {
  const { profiles, currentProfile, selectProfile, deleteProfile } = useCurrentProfile();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  // O estado só muda no próximo render: dois cliques no mesmo lote veriam busy ainda false
  const busyRef = useRef(false);
  // Excluído o perfil, o botão que abriu o diálogo some: o foco vai para o título da aba
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusTitleOnCloseRef = useRef(false);
  const limitHintId = useId();

  const atLimit = profiles.length >= MAX_PROFILES;
  const isOnly = profiles.length <= 1;

  const open = (profile: Profile) => {
    selectProfile(profile.id);
    onOpenLinks();
  };

  const askDelete = (profile: Profile) => {
    setTyped('');
    setDeleting(profile);
  };

  const closeDelete = () => {
    if (!busyRef.current) setDeleting(null);
  };

  const confirmDelete = async () => {
    if (busyRef.current) return;
    if (!deleting || !confirmationMatches(deleting, typed)) return;
    const label = labelOf(deleting);
    busyRef.current = true;
    setBusy(true);
    let result: DeleteProfileResult;
    try {
      result = await deleteProfile(deleting.id);
    } catch (error) {
      // Falha fora do esperado (rede, por exemplo): mesmo aviso de erro, e o diálogo volta a responder
      console.error('Error deleting profile:', error);
      result = { ok: false, error: 'other' };
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
    if (result.ok === false) {
      toast({
        title: 'Erro',
        description:
          result.error === 'last'
            ? 'Este é o seu único perfil: crie outro antes de excluí-lo.'
            : 'Não foi possível excluir o perfil. Tente de novo.',
        variant: 'destructive',
      });
      return;
    }
    focusTitleOnCloseRef.current = true;
    setDeleting(null);
    toast({ title: 'Perfil excluído', description: `${label} e os dados dele foram apagados.` });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 ref={titleRef} tabIndex={-1} className="text-lg font-medium focus:outline-none">
          Meus perfis
        </h3>
        <p className="text-sm text-muted-foreground">
          Cada perfil tem endereço, visual, links e estatísticas próprios. Quem visita um perfil não vê os outros.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            isCurrent={profile.id === currentProfile?.id}
            isOnly={isOnly}
            onOpen={() => open(profile)}
            onDelete={() => askDelete(profile)}
          />
        ))}

        <Card className="border-dashed">
          <CardContent className="flex h-full flex-col items-start justify-center gap-2 p-4">
            <Button onClick={onCreateProfile} disabled={atLimit} aria-describedby={limitHintId}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Criar novo perfil
            </Button>
            <p id={limitHintId} className="text-xs text-muted-foreground">
              {atLimit
                ? `Você chegou ao limite de ${MAX_PROFILES} perfis. Exclua um para criar outro.`
                : `Até ${MAX_PROFILES} perfis por conta (${profiles.length} em uso).`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!deleting} onOpenChange={(next) => { if (!next) closeDelete(); }}>
        <DialogContent
          className="sm:max-w-md"
          onCloseAutoFocus={(event) => {
            if (!focusTitleOnCloseRef.current) return;
            focusTitleOnCloseRef.current = false;
            event.preventDefault();
            titleRef.current?.focus();
          }}
        >
          {deleting && (
            <>
              <DialogHeader>
                <DialogTitle>Excluir {labelOf(deleting)}?</DialogTitle>
                <DialogDescription>
                  Isso apaga o perfil, os links, a foto, os ícones enviados e as estatísticas dele. O endereço público
                  para de abrir e o @ fica livre. Não dá para desfazer.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-profile-confirm">{confirmationHint(deleting)}</Label>
                <Input
                  id="delete-profile-confirm"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    void confirmDelete();
                  }}
                  autoComplete="off"
                  disabled={busy}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={closeDelete} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirmDelete()}
                  disabled={busy || !confirmationMatches(deleting, typed)}
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                  Excluir perfil
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
