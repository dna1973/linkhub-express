import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAutosave } from '@/hooks/useAutosave';
import { getBrandHex, loadBrandCatalog } from '@/lib/linkIcons/catalog';
import { getOfficialHex } from '@/lib/linkIcons/resolve';
import { linkIconPathFromUrl, prepareIconUpload } from '@/lib/linkIcons/storage';
import { LINK_ICONS_BUCKET, LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';
import { isValidIconValue } from '@/lib/linkIcons/validate';
import { normalizeHex } from '@/utils/linkButtonStyle';
import { isValidUrl, sanitizeText } from '@/utils/sanitize';
import { IconPicker, type IconChoice } from './IconPicker';
import { AccentColorPicker } from './AccentColorPicker';

export interface EditableLink {
  id: number;
  title: string;
  url: string;
  icon_type: string | null;
  icon_value: string | null;
  accent_color: string | null;
}

export interface EditLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: EditableLink | null;
  /** Pasta do perfil no bucket dos ícones: <profileId>/<link_id>-<ts>.<ext>. */
  profileId: string;
  /** Chamado depois de cada gravação que deu certo (quem usa recarrega a lista). */
  onSaved: () => void;
}

type Fields = { title: string; url: string };
type IconState = { icon_type: string | null; icon_value: string | null; accent_color: string | null };
/** O que está gravado no banco para um link, conforme as gravações deste diálogo. */
type SavedState = Fields & IconState;
/** Link e abertura em que uma gravação começou: depois de cada await, só mexe na tela se ainda forem os mesmos. */
type TaskContext = { linkId: number; session: number };

const URL_WARNING = 'Corrija a URL para salvar';
const TITLE_WARNING = 'O título não pode ficar vazio';
const SAVE_ERROR = 'Não foi possível salvar o ícone. Tente de novo.';
const INVALID_ICON_ERROR = 'Este ícone não pode ser usado neste link.';
const FIELDS_ERROR = 'Não foi possível salvar o título e a URL. Tente de novo.';
const UPLOAD_ERROR = 'Não foi possível enviar a imagem. Tente de novo.';
const UPLOAD_SAVE_ERROR = 'Não foi possível salvar o ícone enviado. Tente de novo.';

const TITLE_WARNING_ID = 'edit-link-title-warning';
const URL_WARNING_ID = 'edit-link-url-warning';

function savedStateOf(link: EditableLink): SavedState {
  return {
    title: link.title ?? '',
    url: (link.url ?? '').trim(),
    icon_type: link.icon_type,
    icon_value: link.icon_value,
    accent_color: link.accent_color,
  };
}

function iconOf(state: IconState): IconState {
  return { icon_type: state.icon_type, icon_value: state.icon_value, accent_color: state.accent_color };
}

function isAutoType(type: string | null | undefined): boolean {
  return !type || type === 'auto';
}

/**
 * "Cor oficial acompanha": se a cor atual é o hex oficial do ícone anterior, ela vira o hex oficial
 * do novo (ou null, se ele não tiver). Uma cor escolhida à mão fica como está.
 */
function followOfficialHex(currentColor: string | null, previousHex: string | null, nextHex: string | null): string | null {
  const current = normalizeHex(currentColor);
  if (current && previousHex && current === normalizeHex(previousHex)) return nextHex;
  return currentColor;
}

/**
 * A cor do ícone novo a partir do que está gravado. Os dois hexes usam a URL gravada:
 * o automático anterior era o da URL gravada, e a troca de URL ajusta a cor no salvamento automático.
 */
function followedColorFor(saved: SavedState, choice: IconChoice): string | null {
  const previousHex = getOfficialHex({ url: saved.url, icon_type: saved.icon_type, icon_value: saved.icon_value });
  const nextHex = getOfficialHex({ url: saved.url, icon_type: choice.icon_type, icon_value: choice.icon_value });
  return followOfficialHex(saved.accent_color, previousHex, nextHex);
}

function incrementCount(map: Map<number, number>, id: number, delta: number) {
  const next = (map.get(id) ?? 0) + delta;
  if (next > 0) map.set(id, next);
  else map.delete(id);
}

/**
 * Edição de um link: título e URL com o salvamento automático; ícone e cor gravados na hora,
 * porque fechar o modal antes do salvamento automático perderia a escolha.
 *
 * Todas as gravações passam por uma fila única, e cada uma calcula a regra da cor na hora de rodar,
 * a partir do que está gravado. Cada tarefa guarda o id do link em que começou: trocar de link no meio
 * não grava nem apaga nada no outro.
 */
export const EditLinkDialog: React.FC<EditLinkDialogProps> = ({ open, onOpenChange, link, profileId, onSaved }) => {
  const { toast } = useToast();
  const [fields, setFields] = useState<Fields>({ title: '', url: '' });
  const [icon, setIcon] = useState<IconState>({ icon_type: 'auto', icon_value: null, accent_color: null });
  // Muda a cada abertura: reinicia os seletores e a referência do salvamento automático
  const [session, setSession] = useState(0);
  // Sobe quando o catálogo de marcas chega, para recalcular o hex oficial
  const [catalogVersion, setCatalogVersion] = useState(0);
  // Id do link cujo estado já foi iniciado nesta abertura: antes disso o conteúdo não aparece
  const [readyId, setReadyId] = useState<number | null>(null);
  // Redesenha quando começa ou termina uma gravação imediata
  const [, setBusyVersion] = useState(0);

  // O link mais recente sem fazer o efeito de início rodar a cada objeto novo (o onSaved recarrega a lista)
  const linkRef = useRef(link);
  linkRef.current = link;
  const iconRef = useRef(icon);
  iconRef.current = icon;
  const sessionRef = useRef(0);
  const activeIdRef = useRef<number | null>(null);
  const savedByIdRef = useRef(new Map<number, SavedState>());
  // Gravações na fila ou em voo, por link (todas) e só as imediatas (travam os seletores)
  const inFlightRef = useRef(new Map<number, number>());
  const immediateRef = useRef(new Map<number, number>());
  const writeChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const titleRef = useRef<HTMLInputElement>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const profileIdRef = useRef(profileId);
  profileIdRef.current = profileId;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const applyIcon = (next: IconState) => {
    iconRef.current = next;
    setIcon(next);
  };

  const linkId = link?.id;
  useEffect(() => {
    const current = linkRef.current;
    if (!open || !current) {
      activeIdRef.current = null;
      setReadyId(null);
      return;
    }
    sessionRef.current += 1;
    activeIdRef.current = current.id;
    // Com gravação em andamento, vale o que este diálogo já sabe; o resultado é aplicado quando chegar
    const pending = (inFlightRef.current.get(current.id) ?? 0) > 0;
    const saved = (pending && savedByIdRef.current.get(current.id)) || savedStateOf(current);
    savedByIdRef.current.set(current.id, saved);
    setFields({ title: saved.title, url: saved.url });
    applyIcon(iconOf(saved));
    setSession(sessionRef.current);
    setReadyId(current.id);

    // Marca fora da tabela de detecção: o hex oficial só vem do catálogo
    if (saved.icon_type === 'brand' && saved.icon_value && !getBrandHex(saved.icon_value)) {
      loadBrandCatalog().then(
        () => mounted.current && setCatalogVersion((value) => value + 1),
        () => {},
      );
    }
  }, [open, linkId]);

  const ready = !!link && readyId === link.id;

  useEffect(() => {
    if (ready) titleRef.current?.focus();
  }, [ready, session]);

  const officialHex = useMemo(
    () => getOfficialHex({ url: fields.url, icon_type: icon.icon_type, icon_value: icon.icon_value }),
    // catalogVersion: o getBrandHex passa a achar a marca quando o catálogo chega
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields.url, icon.icon_type, icon.icon_value, catalogVersion],
  );

  const urlInvalid = !isValidUrl(fields.url);
  const titleEmpty = !sanitizeText(fields.title, 100);

  const captureContext = (): TaskContext | null => {
    const id = activeIdRef.current;
    return id === null ? null : { linkId: id, session: sessionRef.current };
  };
  /** A mesma abertura do mesmo link: pode desfazer o que está na tela. */
  const isSameSession = (ctx: TaskContext) =>
    mounted.current && sessionRef.current === ctx.session && activeIdRef.current === ctx.linkId;
  /** O mesmo link na tela (mesmo reaberto): recebe o resultado de uma gravação que deu certo. */
  const isActiveLink = (ctx: TaskContext) => mounted.current && activeIdRef.current === ctx.linkId;

  /** Fila única: autosave e gravações imediatas rodam uma de cada vez, na ordem em que entraram. */
  const enqueue = <T,>(id: number, task: () => Promise<T>): Promise<T> => {
    incrementCount(inFlightRef.current, id, 1);
    const run = writeChainRef.current.then(task, task);
    writeChainRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run.finally(() => incrementCount(inFlightRef.current, id, -1));
  };

  const isBusy = (id: number) => (immediateRef.current.get(id) ?? 0) > 0;
  const setBusy = (id: number, busy: boolean) => {
    incrementCount(immediateRef.current, id, busy ? 1 : -1);
    if (mounted.current) setBusyVersion((value) => value + 1);
  };

  const showError = (description: string) => {
    toast({ title: 'Erro', description, variant: 'destructive' });
  };

  const removeIconFile = async (path: string) => {
    try {
      const { error } = await supabase.storage.from(LINK_ICONS_BUCKET).remove([path]);
      if (error) console.error('Error removing link icon:', error);
    } catch (error) {
      console.error('Error removing link icon:', error);
    }
  };

  /** Título e URL; no automático, a cor acompanha a troca de URL no mesmo update. */
  const saveFields = (ctx: TaskContext, data: Fields) =>
    enqueue(ctx.linkId, async () => {
      const saved = savedByIdRef.current.get(ctx.linkId);
      if (!saved) return;
      const title = sanitizeText(data.title, 100);
      const url = data.url.trim();
      if (!title || !isValidUrl(url)) return;
      if (title === saved.title && url === saved.url) return;

      const values: Record<string, unknown> = { title, url };
      const usedColor = saved.accent_color;
      let followed: string | null | undefined;
      // Compara a URL gravada com a nova (nunca a cada tecla)
      if (isAutoType(saved.icon_type) && url !== saved.url) {
        const color = followOfficialHex(
          usedColor,
          getOfficialHex({ url: saved.url, icon_type: 'auto' }),
          getOfficialHex({ url, icon_type: 'auto' }),
        );
        if (color !== usedColor) {
          followed = color;
          values.accent_color = color;
        }
      }

      const { error } = await supabase.from('links').update(values).eq('id', ctx.linkId);
      if (error) throw error;

      savedByIdRef.current.set(ctx.linkId, {
        ...saved,
        title,
        url,
        ...(followed !== undefined ? { accent_color: followed } : {}),
      });
      // Só troca a cor da tela se ninguém a mudou depois do cálculo
      if (followed !== undefined && isActiveLink(ctx) && iconRef.current.accent_color === usedColor) {
        applyIcon({ ...iconRef.current, accent_color: followed });
      }
      onSavedRef.current();
    });

  const handleAutoSaveEdit = (data: Fields): Promise<void> => {
    const ctx = captureContext();
    return ctx ? saveFields(ctx, data) : Promise.resolve();
  };

  const autosaveStatus = useAutosave(fields, handleAutoSaveEdit, 1500, open && ready && !urlInvalid && !titleEmpty, session);

  /**
   * Grava as colunas do ícone (dentro da fila). O estado novo sai do que está gravado; se falhar,
   * a tela volta ao gravado. Depois do update, apaga o upload anterior desse link, se deixou de ser usado.
   * Não avisa: quem chama decide como.
   */
  const writeIcon = async (
    ctx: TaskContext,
    build: (saved: SavedState) => IconState,
    columns: 'icon' | 'accent',
  ): Promise<boolean> => {
    const saved = savedByIdRef.current.get(ctx.linkId);
    if (!saved) return false;
    const next = build(saved);
    const values: Partial<IconState> =
      columns === 'accent'
        ? { accent_color: next.accent_color }
        : { icon_type: next.icon_type, icon_value: next.icon_value, accent_color: next.accent_color };
    if (isSameSession(ctx)) applyIcon(next);

    let failed = false;
    try {
      const { error } = await supabase.from('links').update(values).eq('id', ctx.linkId);
      if (error) {
        console.error('Error saving link icon:', error);
        failed = true;
      }
    } catch (error) {
      console.error('Error saving link icon:', error);
      failed = true;
    }
    if (failed) {
      if (isSameSession(ctx)) applyIcon(iconOf(saved));
      return false;
    }

    savedByIdRef.current.set(ctx.linkId, { ...saved, ...next });
    if (isActiveLink(ctx)) applyIcon(next);
    if (saved.icon_type === 'upload' && saved.icon_value !== next.icon_value) {
      const oldPath = linkIconPathFromUrl(saved.icon_value, profileIdRef.current, LINK_ICONS_PUBLIC_PREFIX);
      if (oldPath) await removeIconFile(oldPath);
    }
    onSavedRef.current();
    return true;
  };

  const handleIconChange = (choice: IconChoice) => {
    const ctx = captureContext();
    // Uma gravação imediata por vez em cada link
    if (!ctx || isBusy(ctx.linkId)) return;
    if (!isValidIconValue(choice.icon_type, choice.icon_value, { url: fields.url.trim(), uploadPrefix: LINK_ICONS_PUBLIC_PREFIX })) {
      showError(INVALID_ICON_ERROR);
      return;
    }
    const current = iconRef.current;
    if (current.icon_type === choice.icon_type && current.icon_value === choice.icon_value) return;

    const build = (saved: SavedState): IconState => ({ ...choice, accent_color: followedColorFor(saved, choice) });
    const savedNow = savedByIdRef.current.get(ctx.linkId);
    if (savedNow) applyIcon(build(savedNow));
    setBusy(ctx.linkId, true);
    enqueue(ctx.linkId, async () => {
      if (!(await writeIcon(ctx, build, 'icon'))) showError(SAVE_ERROR);
    })
      .catch((error) => console.error('Error saving link icon:', error))
      .finally(() => setBusy(ctx.linkId, false));
  };

  const handleAccentChange = (color: string | null) => {
    const ctx = captureContext();
    if (!ctx || isBusy(ctx.linkId)) return;
    const normalized = color === null ? null : normalizeHex(color);
    // Cor fora do formato não é gravada
    if (color !== null && !normalized) return;

    applyIcon({ ...iconRef.current, accent_color: normalized });
    setBusy(ctx.linkId, true);
    enqueue(ctx.linkId, async () => {
      const ok = await writeIcon(ctx, (saved) => ({ ...iconOf(saved), accent_color: normalized }), 'accent');
      if (!ok) showError(SAVE_ERROR);
    })
      .catch((error) => console.error('Error saving link icon:', error))
      .finally(() => setBusy(ctx.linkId, false));
  };

  // Ordem: preparar → enviar → gravar → apagar o anterior (e apagar o novo se a gravação falhar).
  // Os erros rejeitam com a mensagem legível, que o IconPicker mostra (sem toast, para não duplicar).
  const handleUpload = async (file: File) => {
    const ctx = captureContext();
    const owner = profileIdRef.current;
    if (!ctx || !owner) throw new Error(UPLOAD_ERROR);
    if (isBusy(ctx.linkId)) return;
    setBusy(ctx.linkId, true);
    try {
      // Erro do preparo (tipo, tamanho, SVG ilegível) já vem com a mensagem para o usuário
      const prepared = await prepareIconUpload(file);
      const path = `${owner}/${ctx.linkId}-${Date.now()}.${prepared.ext}`;
      const iconValue = `${LINK_ICONS_PUBLIC_PREFIX}${path}`;
      if (!isValidIconValue('upload', iconValue, { url: '', uploadPrefix: LINK_ICONS_PUBLIC_PREFIX })) {
        throw new Error(UPLOAD_ERROR);
      }

      await enqueue(ctx.linkId, async () => {
        let uploadError: unknown = null;
        try {
          ({ error: uploadError } = await supabase.storage
            .from(LINK_ICONS_BUCKET)
            .upload(path, prepared.blob, { contentType: prepared.contentType }));
        } catch (error) {
          uploadError = error;
        }
        if (uploadError) {
          console.error('Error uploading link icon:', uploadError);
          throw new Error(UPLOAD_ERROR);
        }

        const choice: IconChoice = { icon_type: 'upload', icon_value: iconValue };
        const ok = await writeIcon(ctx, (saved) => ({ ...choice, accent_color: followedColorFor(saved, choice) }), 'icon');
        if (!ok) {
          // Sem a gravação, o arquivo novo ficaria órfão
          await removeIconFile(path);
          throw new Error(UPLOAD_SAVE_ERROR);
        }
      });
    } finally {
      setBusy(ctx.linkId, false);
    }
  };

  // Fechar não descarta título e URL válidos ainda não gravados: vão pela fila
  const handleOpenChange = (next: boolean) => {
    if (!next && ready && !urlInvalid && !titleEmpty) {
      const ctx = captureContext();
      if (ctx) {
        saveFields(ctx, fields).catch((error) => {
          console.error('Error saving link:', error);
          showError(FIELDS_ERROR);
        });
      }
    }
    onOpenChange(next);
  };

  const saving = ready && isBusy(link.id);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-sm border-border/50 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Link</DialogTitle>
          <DialogDescription>O título e a URL são salvos sozinhos; o ícone e a cor, na hora.</DialogDescription>
        </DialogHeader>

        {ready && (
          <div className="space-y-5">
            <div className="space-y-3">
              <div>
                <label htmlFor="edit-link-title" className="text-sm font-medium">
                  Título
                </label>
                <Input
                  id="edit-link-title"
                  ref={titleRef}
                  value={fields.title}
                  aria-invalid={titleEmpty ? true : undefined}
                  aria-describedby={titleEmpty ? TITLE_WARNING_ID : undefined}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFields((prev) => ({ ...prev, title: value }));
                  }}
                  className="mt-1"
                />
                {titleEmpty && (
                  <p id={TITLE_WARNING_ID} role="alert" className="mt-1 text-sm text-destructive">
                    {TITLE_WARNING}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="edit-link-url" className="text-sm font-medium">
                  URL
                </label>
                <Input
                  id="edit-link-url"
                  value={fields.url}
                  inputMode="url"
                  autoComplete="off"
                  aria-invalid={urlInvalid ? true : undefined}
                  aria-describedby={urlInvalid ? URL_WARNING_ID : undefined}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFields((prev) => ({ ...prev, url: value }));
                  }}
                  className="mt-1"
                />
                {urlInvalid && (
                  <p id={URL_WARNING_ID} role="alert" className="mt-1 text-sm text-destructive">
                    {URL_WARNING}
                  </p>
                )}
              </div>
            </div>

            <section className="space-y-2" aria-labelledby="edit-link-icon-heading">
              <div className="flex items-center justify-between gap-2">
                <h3 id="edit-link-icon-heading" className="text-sm font-medium">
                  Ícone
                </h3>
                <p aria-live="polite" className="flex items-center gap-1 text-xs text-muted-foreground">
                  {saving && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      Gravando…
                    </>
                  )}
                </p>
              </div>
              <IconPicker
                key={`icon-${session}`}
                url={fields.url}
                iconType={icon.icon_type}
                iconValue={icon.icon_value}
                accentColor={icon.accent_color}
                disabled={saving}
                onChange={handleIconChange}
                onUpload={handleUpload}
              />
            </section>

            <section className="space-y-2" aria-labelledby="edit-link-color-heading">
              <h3 id="edit-link-color-heading" className="text-sm font-medium">
                Cor de destaque
              </h3>
              <AccentColorPicker
                key={`color-${session}`}
                url={fields.url}
                iconType={icon.icon_type}
                iconValue={icon.icon_value}
                accentColor={icon.accent_color}
                officialHex={officialHex}
                disabled={saving}
                onChange={handleAccentChange}
              />
            </section>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div aria-live="polite" className="flex items-center gap-2">
                  {autosaveStatus === 'saving' && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Salvando...</span>
                    </>
                  )}
                  {autosaveStatus === 'saved' && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
                      <span className="text-green-500">Salvo</span>
                    </>
                  )}
                  {autosaveStatus === 'error' && (
                    <>
                      <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                      <span className="text-destructive">Erro ao salvar</span>
                    </>
                  )}
                </div>
                {autosaveStatus === 'idle' && <span className="text-muted-foreground/50">Autosave ativo</span>}
              </div>
              <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
