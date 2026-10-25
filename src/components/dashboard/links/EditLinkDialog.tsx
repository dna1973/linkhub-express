import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  userId: string;
  /** Chamado depois de cada gravação que deu certo (quem usa recarrega a lista). */
  onSaved: () => void;
}

type Fields = { title: string; url: string };
type IconState = { icon_type: string | null; icon_value: string | null; accent_color: string | null };

const URL_WARNING = 'Corrija a URL para salvar';
const TITLE_WARNING = 'O título não pode ficar vazio';
const SAVE_ERROR = 'Não foi possível salvar o ícone. Tente de novo.';
const UPLOAD_ERROR = 'Não foi possível enviar a imagem. Tente de novo.';
const UPLOAD_SAVE_ERROR = 'Não foi possível salvar o ícone enviado. Tente de novo.';

function iconStateOf(link: EditableLink): IconState {
  return { icon_type: link.icon_type, icon_value: link.icon_value, accent_color: link.accent_color };
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
 * Edição de um link: título e URL com o salvamento automático; ícone e cor gravados na hora,
 * porque fechar o modal antes do salvamento automático perderia a escolha.
 */
export const EditLinkDialog: React.FC<EditLinkDialogProps> = ({ open, onOpenChange, link, userId, onSaved }) => {
  const { toast } = useToast();
  const [fields, setFields] = useState<Fields>({ title: '', url: '' });
  const [icon, setIcon] = useState<IconState>({ icon_type: 'auto', icon_value: null, accent_color: null });
  const [saving, setSaving] = useState(false);
  // Muda a cada abertura: reinicia os seletores e a referência do salvamento automático
  const [session, setSession] = useState(0);
  // Sobe quando o catálogo de marcas chega, para recalcular o hex oficial
  const [catalogVersion, setCatalogVersion] = useState(0);
  // Id do link cujo estado já foi iniciado nesta abertura: antes disso o conteúdo não aparece
  const [readyId, setReadyId] = useState<number | null>(null);

  // O link mais recente sem fazer o efeito de início rodar a cada objeto novo (o onSaved recarrega a lista)
  const linkRef = useRef(link);
  linkRef.current = link;
  const iconRef = useRef(icon);
  iconRef.current = icon;
  const savingRef = useRef(false);
  // A URL que está gravada: base da regra da cor no salvamento automático
  const savedUrlRef = useRef('');
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const linkId = link?.id;
  useEffect(() => {
    const current = linkRef.current;
    if (!open || !current) {
      setReadyId(null);
      return;
    }
    setFields({ title: current.title ?? '', url: current.url ?? '' });
    setIcon(iconStateOf(current));
    savedUrlRef.current = (current.url ?? '').trim();
    setSession((value) => value + 1);
    setReadyId(current.id);

    // Marca fora da tabela de detecção: o hex oficial só vem do catálogo
    if (current.icon_type === 'brand' && current.icon_value && !getBrandHex(current.icon_value)) {
      loadBrandCatalog().then(
        () => mounted.current && setCatalogVersion((value) => value + 1),
        () => {},
      );
    }
  }, [open, linkId]);

  const officialHex = useMemo(
    () => getOfficialHex({ url: fields.url, icon_type: icon.icon_type, icon_value: icon.icon_value }),
    // catalogVersion: o getBrandHex passa a achar a marca quando o catálogo chega
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields.url, icon.icon_type, icon.icon_value, catalogVersion],
  );

  const ready = !!link && readyId === link.id;
  const urlInvalid = !isValidUrl(fields.url);
  const titleEmpty = !sanitizeText(fields.title, 100);

  const handleAutoSaveEdit = useCallback(async (data: Fields) => {
    const current = linkRef.current;
    if (!current) return;
    const title = sanitizeText(data.title, 100);
    const url = data.url.trim();
    if (!title || !isValidUrl(url)) return;

    const values: Record<string, unknown> = { title, url };
    // Regra da cor no automático: compara a URL gravada com a nova (nunca a cada tecla)
    const currentIcon = iconRef.current;
    const previousUrl = savedUrlRef.current;
    let nextColor: string | null | undefined;
    if (isAutoType(currentIcon.icon_type) && url !== previousUrl) {
      const followed = followOfficialHex(
        currentIcon.accent_color,
        getOfficialHex({ url: previousUrl, icon_type: 'auto' }),
        getOfficialHex({ url, icon_type: 'auto' }),
      );
      if (followed !== currentIcon.accent_color) {
        nextColor = followed;
        values.accent_color = followed;
      }
    }

    const { error } = await supabase.from('links').update(values).eq('id', current.id);
    if (error) throw error;

    savedUrlRef.current = url;
    if (nextColor !== undefined && mounted.current) {
      setIcon((state) => ({ ...state, accent_color: nextColor }));
    }
    onSavedRef.current();
  }, []);

  const autosaveStatus = useAutosave(
    fields,
    handleAutoSaveEdit,
    1500,
    open && ready && !urlInvalid && !titleEmpty,
    session,
  );

  const removeIconFile = async (path: string) => {
    try {
      const { error } = await supabase.storage.from(LINK_ICONS_BUCKET).remove([path]);
      if (error) console.error('Error removing link icon:', error);
    } catch (error) {
      console.error('Error removing link icon:', error);
    }
  };

  const showError = (description: string) => {
    toast({ title: 'Erro', description, variant: 'destructive' });
  };

  /**
   * Grava as colunas do ícone na hora, com o estado novo já na tela; se falhar, volta ao anterior.
   * Depois do update, apaga o upload anterior que deixou de ser usado. Não avisa: quem chama decide como.
   */
  const persistIcon = async (next: IconState, values: Partial<IconState>): Promise<boolean> => {
    const current = linkRef.current;
    if (!current) return false;
    const previous = iconRef.current;
    setIcon(next);

    const { error } = await supabase.from('links').update(values).eq('id', current.id);
    if (error) {
      if (mounted.current) setIcon(previous);
      return false;
    }

    if (previous.icon_type === 'upload' && previous.icon_value !== next.icon_value) {
      const oldPath = linkIconPathFromUrl(previous.icon_value, userId, LINK_ICONS_PUBLIC_PREFIX);
      if (oldPath) await removeIconFile(oldPath);
    }
    onSavedRef.current();
    return true;
  };

  // Um só por vez: os seletores ficam desabilitados enquanto grava
  const runExclusive = async (task: () => Promise<void>) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await task();
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  /** O ícone novo com a cor que acompanha a marca, quando a atual era a oficial da anterior. */
  const withFollowedColor = (choice: IconChoice): IconState => {
    const previous = iconRef.current;
    const previousHex = getOfficialHex({ url: fields.url, icon_type: previous.icon_type, icon_value: previous.icon_value });
    const nextHex = getOfficialHex({ url: fields.url, icon_type: choice.icon_type, icon_value: choice.icon_value });
    return { ...choice, accent_color: followOfficialHex(previous.accent_color, previousHex, nextHex) };
  };

  const handleIconChange = (choice: IconChoice) =>
    runExclusive(async () => {
      const previous = iconRef.current;
      if (previous.icon_type === choice.icon_type && previous.icon_value === choice.icon_value) return;
      const next = withFollowedColor(choice);
      if (!(await persistIcon(next, next))) showError(SAVE_ERROR);
    });

  const handleAccentChange = (color: string | null) =>
    runExclusive(async () => {
      const next = { ...iconRef.current, accent_color: color };
      if (!(await persistIcon(next, { accent_color: color }))) showError(SAVE_ERROR);
    });

  // Ordem: preparar → enviar → gravar → apagar o anterior (e apagar o novo se a gravação falhar).
  // Os erros rejeitam com a mensagem legível, que o IconPicker mostra (sem toast, para não duplicar).
  const handleUpload = async (file: File) => {
    const current = linkRef.current;
    if (!current || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      // Erro do preparo (tipo, tamanho, SVG ilegível) já vem com a mensagem para o usuário
      const prepared = await prepareIconUpload(file);
      const path = `${userId}/${current.id}-${Date.now()}.${prepared.ext}`;

      const { error: uploadError } = await supabase.storage
        .from(LINK_ICONS_BUCKET)
        .upload(path, prepared.blob, { contentType: prepared.contentType });
      if (uploadError) {
        console.error('Error uploading link icon:', uploadError);
        throw new Error(UPLOAD_ERROR);
      }

      const next = withFollowedColor({ icon_type: 'upload', icon_value: `${LINK_ICONS_PUBLIC_PREFIX}${path}` });
      const ok = await persistIcon(next, next);
      if (!ok) {
        // Sem a gravação, o arquivo novo ficaria órfão
        await removeIconFile(path);
        throw new Error(UPLOAD_SAVE_ERROR);
      }
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const fieldWarning = urlInvalid ? URL_WARNING : titleEmpty ? TITLE_WARNING : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  value={fields.title}
                  aria-invalid={titleEmpty ? true : undefined}
                  aria-describedby={fieldWarning ? 'edit-link-warning' : undefined}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFields((prev) => ({ ...prev, title: value }));
                  }}
                  className="mt-1"
                />
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
                  aria-describedby={fieldWarning ? 'edit-link-warning' : undefined}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFields((prev) => ({ ...prev, url: value }));
                  }}
                  className="mt-1"
                />
              </div>
              {fieldWarning && (
                <p id="edit-link-warning" role="alert" className="text-sm text-destructive">
                  {fieldWarning}
                </p>
              )}
            </div>

            <section className="space-y-2" aria-labelledby="edit-link-icon-heading">
              <div className="flex items-center justify-between gap-2">
                <h4 id="edit-link-icon-heading" className="text-sm font-medium">
                  Ícone
                </h4>
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
              <h4 id="edit-link-color-heading" className="text-sm font-medium">
                Cor de destaque
              </h4>
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
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
                {autosaveStatus === 'idle' && <span className="text-muted-foreground/50">Autosave ativo</span>}
              </div>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
