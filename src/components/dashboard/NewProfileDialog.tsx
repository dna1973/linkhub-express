import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsernameInput } from '@/components/ui/username-input';
import { useToast } from '@/hooks/use-toast';
import { useUsernameValidation } from '@/hooks/useUsernameValidation';
import { MAX_PROFILES, useCurrentProfile, type CreateProfileError } from '@/contexts/CurrentProfileContext';

interface NewProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Id do perfil criado, já selecionado. O Dashboard abre o onboarding para ele. */
  onCreated: (profileId: string) => void;
}

const FIELD_ERRORS: Partial<Record<CreateProfileError, string>> = {
  taken: 'Este username já está em uso',
  invalid: 'Este @username não pode ser usado',
};

/**
 * @username (obrigatório) e nome do perfil novo. O resto (tipo, foto, modelo, links) vem do onboarding.
 * Sem <form>: os botões de sugestão do UsernameInput não têm type="button" e enviariam o formulário.
 */
export const NewProfileDialog: React.FC<NewProfileDialogProps> = ({ open, onOpenChange, onCreated }) => {
  const { createProfile, selectProfile } = useCurrentProfile();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  // Sem perfil atual: um @ que já é de outro perfil da conta também conta como em uso
  const validation = useUsernameValidation(username);

  const reset = () => {
    setUsername('');
    setFullName('');
    setFieldError(null);
    setLimitReached(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (saving) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const canSubmit = !!username && validation.isValid && validation.isAvailable && !validation.isChecking && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setFieldError(null);
    setLimitReached(false);
    const result = await createProfile({ username, full_name: fullName.trim() });
    setSaving(false);

    if (result.ok === false) {
      if (result.error === 'limit') setLimitReached(true);
      else if (FIELD_ERRORS[result.error]) setFieldError(FIELD_ERRORS[result.error]);
      else toast({ title: 'Erro', description: 'Não foi possível criar o perfil. Tente de novo.', variant: 'destructive' });
      return;
    }

    selectProfile(result.id);
    reset();
    onOpenChange(false);
    onCreated(result.id);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo perfil</DialogTitle>
          <DialogDescription>
            Escolha o @username e o nome. Depois, o assistente ajuda a montar o visual e os links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <UsernameInput
              value={username}
              onChange={(value) => {
                setUsername(value);
                setFieldError(null);
              }}
              label="@username"
              placeholder="novoperfil"
              disabled={saving}
            />
            {fieldError && (
              <p role="alert" className="text-xs text-red-600">
                {fieldError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-profile-name">Nome</Label>
            <Input
              id="new-profile-name"
              value={fullName}
              maxLength={100}
              placeholder="Como o perfil vai aparecer"
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
            />
          </div>

          {limitReached && (
            <p role="alert" className="text-sm text-destructive">
              Você já tem {MAX_PROFILES} perfis
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />}
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
