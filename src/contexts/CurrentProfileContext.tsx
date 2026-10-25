import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDesignStore } from '@/stores/useDesignStore';
import { resolveThemeConfig } from '@/utils/themes';
import { AVATARS_BUCKET, avatarPathFromUrl } from '@/lib/avatarStorage';
import { LINK_ICONS_BUCKET } from '@/lib/linkIcons/storagePrefix';
import { linkIconPathFromUrl } from '@/lib/linkIcons/storage';
import type { Database } from '@/integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/** Limite por conta. O banco confere de novo no create_profile. */
export const MAX_PROFILES = 10;

export type CreateProfileError = 'limit' | 'taken' | 'invalid' | 'other';
export type CreateProfileResult = { ok: true; id: string } | { ok: false; error: CreateProfileError };
export type DeleteProfileError = 'last' | 'not_owner' | 'other';
export type DeleteProfileResult = { ok: true } | { ok: false; error: DeleteProfileError };

export interface CurrentProfileContextValue {
  profiles: Profile[];
  currentProfile: Profile | null;
  /** Só a primeira carga da conta. As recargas depois de salvar não voltam a true. */
  loading: boolean;
  /** Só vale com !currentProfile: uma recarga que falha com perfil na tela também grava o erro. */
  error: string | null;
  selectProfile: (id: string) => void;
  reloadProfiles: () => Promise<void>;
  createProfile: (input: { username: string; full_name: string }) => Promise<CreateProfileResult>;
  deleteProfile: (id: string) => Promise<DeleteProfileResult>;
}

type RpcError = { code?: string; hint?: string | null; message?: string } | null;
type DeletedFiles = { avatar_url?: string | null; icon_urls?: string[] | null };

const LOAD_ERROR = 'Não foi possível carregar seus perfis.';
const FIRST_PROFILE_ERROR = 'Não foi possível criar o seu primeiro perfil.';

const CurrentProfileContext = createContext<CurrentProfileContextValue | undefined>(undefined);

export function useCurrentProfile(): CurrentProfileContextValue {
  const context = useContext(CurrentProfileContext);
  if (context === undefined) {
    throw new Error('useCurrentProfile must be used within a CurrentProfileProvider');
  }
  return context;
}

export const currentProfileStorageKey = (userId: string) => `linkhub:currentProfile:${userId}`;

function readStoredProfileId(userId: string): string | null {
  try {
    return window.localStorage.getItem(currentProfileStorageKey(userId));
  } catch {
    return null;
  }
}

function writeStoredProfileId(userId: string, profileId: string) {
  try {
    window.localStorage.setItem(currentProfileStorageKey(userId), profileId);
  } catch {
    // Sem localStorage (janela privada, site bloqueado): a escolha vale até recarregar a página
  }
}

/** O frontend decide pelo hint (ou pelo 23505 do unique do @), nunca pela mensagem. */
export function createProfileErrorFrom(error: RpcError): CreateProfileError {
  if (error?.hint === 'linkhub_profile_limit') return 'limit';
  if (error?.hint === 'linkhub_invalid_username') return 'invalid';
  if (error?.code === '23505') return 'taken';
  return 'other';
}

export function deleteProfileErrorFrom(error: RpcError): DeleteProfileError {
  if (error?.hint === 'linkhub_last_profile') return 'last';
  if (error?.hint === 'linkhub_not_owner') return 'not_owner';
  return 'other';
}

/** Aplica o tema salvo do perfil no editor e na prévia. Sem tema salvo, volta ao padrão. */
export function applyProfileTheme(profile: Profile | null): void {
  const store = useDesignStore.getState();
  const raw = profile?.theme_options;
  const options = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, any>) : null;
  const resolved = resolveThemeConfig(options);
  if (!resolved) {
    store.resetDesign();
    return;
  }
  store.setCurrentTheme(options.themeId || 'custom');
  store.setCustomTheme(resolved);
}

const themeKeyOf = (profile: Profile) => `${profile.id}:${JSON.stringify(profile.theme_options ?? null)}`;

function pickProfileId(list: Profile[], preferred: string | null): string | null {
  if (preferred && list.some((p) => p.id === preferred)) return preferred;
  return list[0]?.id ?? null;
}

function displayNameOf(user: User): string {
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario';
}

async function fetchOwnProfiles(): Promise<Profile[] | null> {
  try {
    const { data, error } = await supabase.rpc('list_own_profiles');
    if (error) {
      console.error('Error loading profiles:', error);
      return null;
    }
    return (data ?? []) as Profile[];
  } catch (error) {
    console.error('Error loading profiles:', error);
    return null;
  }
}

async function removeFiles(bucket: string, paths: string[]) {
  if (paths.length === 0) return;
  try {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) console.error('Error removing profile files:', error);
  } catch (error) {
    console.error('Error removing profile files:', error);
  }
}

export const CurrentProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userRef = useRef(user);
  userRef.current = user;

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const profilesRef = useRef<Profile[]>([]);
  const currentIdRef = useRef<string | null>(null);
  // Perfil e tema aplicados por último no useDesignStore
  const themeKeyRef = useRef('');
  // Insert do primeiro perfil em andamento: duas cargas ao mesmo tempo fazem um insert só
  const firstProfileRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);
  // Número da carga mais recente: só ela mexe no estado (como o requestRef do Analytics).
  // A troca de conta e a saída do layout também avançam o número, e a carga pendente é descartada.
  const loadSeqRef = useRef(0);
  // Provider montado: depois de sair do layout, nada mais mexe no tema, no localStorage nem no estado
  const mountedRef = useRef(false);
  // Perfil recém-criado: a carga que primeiro o trouxer na lista o seleciona, mesmo que não seja a do createProfile
  const pendingSelectRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Torna `id` o perfil atual: grava a escolha e aplica o tema. O aviso à prévia sai depois do commit. */
  const activate = useCallback((list: Profile[], id: string | null, accountId: string) => {
    const profile = list.find((p) => p.id === id) ?? null;
    const changed = id !== currentIdRef.current;
    currentIdRef.current = id;
    setCurrentId(id);
    if (!profile) return;
    if (changed) writeStoredProfileId(accountId, profile.id);
    const key = themeKeyOf(profile);
    if (key !== themeKeyRef.current) {
      themeKeyRef.current = key;
      applyProfileTheme(profile);
    }
  }, []);

  const ensureFirstProfile = useCallback((account: User): Promise<void> => {
    if (firstProfileRef.current?.userId === account.id) return firstProfileRef.current.promise;
    const promise = (async () => {
      // A conta saiu (logout) ou o layout fechou durante a carga: não cria perfil para ninguém
      if (!mountedRef.current || userRef.current?.id !== account.id) return;
      const { error: insertError } = await supabase.from('profiles').insert({
        id: account.id,
        full_name: displayNameOf(account),
        avatar_url: account.user_metadata?.avatar_url || null,
      });
      // 23505: outra carga (outra aba) criou antes; a chave primária garante um perfil só
      if (insertError && insertError.code !== '23505') throw insertError;
    })();
    firstProfileRef.current = { userId: account.id, promise };
    // Terminado (com sucesso ou não), sai do ref: a próxima carga com a lista vazia tenta de novo
    const clear = () => {
      if (firstProfileRef.current?.promise === promise) firstProfileRef.current = null;
    };
    promise.then(clear, clear);
    return promise;
  }, []);

  const load = useCallback(async (): Promise<void> => {
    const account = userRef.current;
    if (!account || !mountedRef.current) return;
    const seq = ++loadSeqRef.current;

    let list = await fetchOwnProfiles();
    let failure: string | null = list ? null : LOAD_ERROR;
    // Conta sem perfil: só quando a lista veio certa e vazia, nunca em erro de rede
    if (list && list.length === 0) {
      try {
        await ensureFirstProfile(account);
        list = await fetchOwnProfiles();
        failure = !list ? LOAD_ERROR : list.length === 0 ? FIRST_PROFILE_ERROR : null;
      } catch (insertError) {
        console.error('Error creating first profile:', insertError);
        failure = FIRST_PROFILE_ERROR;
      }
    }

    // A conta mudou durante a carga, o layout fechou ou uma carga mais nova começou: este resultado não vale mais
    if (!mountedRef.current || userRef.current?.id !== account.id || seq !== loadSeqRef.current) return;
    if (failure) {
      setError(failure);
      setLoading(false);
      return;
    }

    profilesRef.current = list;
    setProfiles(list);
    setError(null);
    const pending = pendingSelectRef.current;
    if (pending && list.some((p) => p.id === pending)) {
      pendingSelectRef.current = null;
      activate(list, pending, account.id);
    } else {
      activate(list, pickProfileId(list, currentIdRef.current ?? readStoredProfileId(account.id)), account.id);
    }
    setLoading(false);
  }, [activate, ensureFirstProfile]);

  // Reinicia quando a conta muda (o objeto user muda a cada renovação do token; o id, não)
  useEffect(() => {
    // Invalida a carga pendente da conta anterior
    loadSeqRef.current++;
    profilesRef.current = [];
    currentIdRef.current = null;
    themeKeyRef.current = '';
    pendingSelectRef.current = null;
    // O editor não fica com o tema da conta anterior enquanto a nova carrega
    useDesignStore.getState().resetDesign();
    setProfiles([]);
    setCurrentId(null);
    setError(null);
    if (!userId) {
      setLoading(false);
    } else {
      setLoading(true);
      void load();
    }
    // Troca de conta ou saída do layout: a carga em andamento não aplica mais nada
    return () => {
      loadSeqRef.current++;
    };
  }, [userId, load]);

  // Avisa a prévia depois do commit, quando o perfil atual muda de fato: quem ouve já vê o perfil novo
  useEffect(() => {
    if (currentId) window.dispatchEvent(new CustomEvent('linksUpdated'));
  }, [currentId]);

  const selectProfile = useCallback((id: string) => {
    const account = userRef.current;
    if (!account || !profilesRef.current.some((p) => p.id === id)) return;
    // Escolha explícita: um perfil recém-criado ainda pendente não toma o lugar dela depois
    pendingSelectRef.current = null;
    activate(profilesRef.current, id, account.id);
  }, [activate]);

  const createProfile = useCallback(async (input: { username: string; full_name: string }): Promise<CreateProfileResult> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('create_profile', {
        p_username: input.username,
        p_full_name: input.full_name,
      });
      if (rpcError || !data) return { ok: false, error: createProfileErrorFrom(rpcError) };
      // O perfil já existe no banco: a carga que o trouxer o seleciona, esta ou uma recarga
      // que a supere. Se a recarga falhar, o id fica pendente para a próxima e a resposta
      // continua ok (um erro faria o usuário tentar de novo e esbarrar no próprio @).
      pendingSelectRef.current = data;
      await load();
      return { ok: true, id: data };
    } catch (rpcError) {
      console.error('Error creating profile:', rpcError);
      return { ok: false, error: 'other' };
    }
  }, [load]);

  const deleteProfile = useCallback(async (id: string): Promise<DeleteProfileResult> => {
    let files: DeletedFiles;
    try {
      const { data, error: rpcError } = await supabase.rpc('delete_own_profile', { p_profile_id: id });
      if (rpcError) return { ok: false, error: deleteProfileErrorFrom(rpcError) };
      files = (data ?? {}) as unknown as DeletedFiles;
    } catch (rpcError) {
      console.error('Error deleting profile:', rpcError);
      return { ok: false, error: 'other' };
    }

    // Melhor esforço: o perfil já saiu, então a falha só vai para o console. As políticas de
    // SELECT e DELETE do Storage olham o owner_id (quem enviou), por isso a remoção funciona agora.
    const avatarPath = avatarPathFromUrl(files.avatar_url, id);
    const iconPaths = (files.icon_urls ?? [])
      .map((url) => linkIconPathFromUrl(url, id))
      .filter((path): path is string => !!path);
    await removeFiles(AVATARS_BUCKET, avatarPath ? [avatarPath] : []);
    await removeFiles(LINK_ICONS_BUCKET, iconPaths);

    // O perfil atual saiu da lista: a recarga seleciona o primeiro que restou
    await load();
    return { ok: true };
  }, [load]);

  const currentProfile = useMemo(() => profiles.find((p) => p.id === currentId) ?? null, [profiles, currentId]);

  const value = useMemo<CurrentProfileContextValue>(
    () => ({
      profiles,
      currentProfile,
      loading,
      error,
      selectProfile,
      reloadProfiles: load,
      createProfile,
      deleteProfile,
    }),
    [profiles, currentProfile, loading, error, selectProfile, load, createProfile, deleteProfile],
  );

  return <CurrentProfileContext.Provider value={value}>{children}</CurrentProfileContext.Provider>;
};
