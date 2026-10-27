import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LinkIcon } from '@/components/links/LinkIcon';
import { detectIconFromUrl, getUrlHost } from '@/lib/linkIcons/detect';
import { isValidUrl } from '@/utils/sanitize';

export interface AddLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Grava o link; devolve true quando deu certo (o diálogo limpa os campos e fecha). */
  onAdd: (data: { title: string; url: string }) => Promise<boolean>;
}

/** Título que acompanha a URL: o da marca (ou "E-mail" no mailto:); sem marca, o host. */
function getAutoTitle(url: string): string {
  return detectIconFromUrl(url)?.title ?? getUrlHost(url) ?? '';
}

const ERROR_ID = 'add-link-error';

type FieldError = { field: 'url' | 'title'; message: string };

function getPreviewLabel(url: string): string {
  const detected = detectIconFromUrl(url);
  if (detected) return `Ícone detectado: ${detected.title}`;
  return getUrlHost(url) ? 'Ícone do site' : 'Ícone padrão';
}

export const AddLinkDialog: React.FC<AddLinkDialogProps> = ({ open, onOpenChange, onAdd }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  // Enquanto o usuário não digita no título, ele acompanha a URL
  const [titleTouched, setTitleTouched] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<FieldError | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const autoTitle = getAutoTitle(url);
  const shownTitle = titleTouched ? title : autoTitle;
  const showPreview = url.trim() !== '' && isValidUrl(url);

  const reset = () => {
    setUrl('');
    setTitle('');
    setTitleTouched(false);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    // Enquanto grava, fechar perderia o retorno do onAdd
    if (!next && adding) return;
    if (!next) reset();
    onOpenChange(next);
  };

  // O erro fica ligado ao campo recusado (aria-invalid + aria-describedby)
  const errorProps = (field: FieldError['field']) =>
    error?.field === field ? { 'aria-invalid': true as const, 'aria-describedby': ERROR_ID } : {};

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (adding) return;

    if (!isValidUrl(url)) {
      setError({ field: 'url', message: 'A URL fornecida não é válida' });
      urlRef.current?.focus();
      return;
    }
    // Título só com espaços conta como vazio: vale o automático
    const finalTitle = (titleTouched ? title.trim() : '') || autoTitle.trim();
    if (!finalTitle) {
      setError({ field: 'title', message: 'Informe um título' });
      titleRef.current?.focus();
      return;
    }

    setError(null);
    setAdding(true);
    let ok = false;
    try {
      ok = await onAdd({ title: finalTitle, url: url.trim() });
    } finally {
      setAdding(false);
    }
    if (ok) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-sm border-border/50">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Link</DialogTitle>
          <DialogDescription>Cole a URL: o ícone e o título saem dela.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-3">
            <div>
              <label htmlFor="add-link-url" className="text-sm font-medium">
                URL
              </label>
              <Input
                id="add-link-url"
                ref={urlRef}
                autoFocus
                {...errorProps('url')}
                inputMode="url"
                autoComplete="off"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder="https://..."
                className="mt-1"
              />
            </div>

            {showPreview && (
              <div data-testid="add-link-icon-preview" className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-white">
                  <LinkIcon link={{ url, icon_type: 'auto' }} size={18} defaultColor="#1f2937" backgrounds={['#ffffff']} />
                </span>
                <span>{getPreviewLabel(url)}</span>
              </div>
            )}

            <div>
              <label htmlFor="add-link-title" className="text-sm font-medium">
                Título (opcional)
              </label>
              <Input
                id="add-link-title"
                ref={titleRef}
                {...errorProps('title')}
                value={shownTitle}
                onChange={(e) => {
                  const value = e.target.value;
                  setTitle(value);
                  // Apagou tudo: o automático volta
                  setTitleTouched(value !== '');
                  setError(null);
                }}
                placeholder="Sai da URL se ficar em branco"
                className="mt-1"
              />
            </div>
          </div>

          {error && (
            <p id={ERROR_ID} role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}

          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={adding} className="flex-1 btn-gradient-primary">
              {adding ? 'Adicionando…' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
