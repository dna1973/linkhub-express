import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/BrandLogo';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  NEW_PASSWORD_MIN_LENGTH,
  RESET_LINK_INVALID_MESSAGE,
  forgetRecoveryLink,
  forgetRecoveryUser,
  getRecoveryLinkError,
  getRecoveryUserId,
  newPasswordErrorMessage,
} from '@/lib/passwordRecovery';

type Status = 'checking' | 'ready' | 'invalid' | 'saved';

/** A sessão é a que o PASSWORD_RECOVERY marcou (src/integrations/supabase/client.ts)? */
function isRecoverySession(session: Session | null): boolean {
  const markedId = getRecoveryUserId();
  return Boolean(markedId) && session?.user?.id === markedId;
}

/** Depois da senha gravada: sai do servidor (revoga as outras sessões) ou, se falhar, deste aparelho. */
async function signOutAfterChange(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.signOut();
    if (!error) return true;
  } catch {
    // tenta a saída local
  }
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    return !error;
  } catch {
    return false;
  }
}

/**
 * /auth/nova-senha: destino do link do e-mail de recuperação.
 * Só mostra o formulário para a sessão da conta marcada pelo evento PASSWORD_RECOVERY; o hash
 * (type=recovery) não vale, porque qualquer um o escreve e um link que falha mantém a sessão
 * antiga. De propósito, não redireciona para o painel por haver sessão, e sai da conta ao
 * terminar: assim a recuperação não cria um perfil do LinkHub (o CurrentProfileProvider cria o
 * primeiro ao abrir o painel).
 */
const NewPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // O estado só desabilita o botão no próximo render; a ref barra o segundo envio já no mesmo
  const savingRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const linkError = getRecoveryLinkError();
    let active = true;
    const apply = (session: Session | null) => {
      // Durante a gravação, o USER_UPDATED e o SIGNED_OUT do próprio fluxo não mexem na tela
      if (!active || savingRef.current) return;
      sessionRef.current = session;
      const ready = !linkError && isRecoverySession(session);
      setStatus((prev) => (prev === 'saved' ? prev : ready ? 'ready' : 'invalid'));
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    // O getSession espera o supabase-js terminar de ler o link
    supabase.auth
      .getSession()
      .then(({ data }) => apply(data?.session ?? null))
      .catch(() => apply(null));
    return () => {
      active = false;
      subscription.unsubscribe();
      forgetRecoveryLink();
    };
  }, []);

  useEffect(() => {
    if (status === 'invalid') forgetRecoveryLink();
    if (status !== 'checking') titleRef.current?.focus();
  }, [status]);

  const tooShort = password.length > 0 && password.length < NEW_PASSWORD_MIN_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = password.length >= NEW_PASSWORD_MIN_LENGTH && password === confirm;

  const goToLogin = async () => {
    // Sessão aberta por um link de recuperação: sai dela, senão o login a mandaria ao painel
    if (isRecoverySession(sessionRef.current)) {
      try {
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (!signOutError) forgetRecoveryUser();
      } catch {
        // continua marcada: o login a traz de volta para cá
      }
    }
    navigate('/auth', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);

    let saveError: string | null = null;
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) saveError = newPasswordErrorMessage(updateError);
    } catch {
      saveError = newPasswordErrorMessage(null);
    }
    if (saveError) {
      savingRef.current = false;
      setSaving(false);
      setError(saveError);
      return;
    }

    // A senha já foi gravada: daqui em diante nenhum erro diz que ela falhou
    const signedOut = await signOutAfterChange();
    savingRef.current = false;
    setSaving(false);
    if (!signedOut) {
      setStatus('saved');
      return;
    }
    forgetRecoveryUser();
    forgetRecoveryLink();
    toast({ title: 'Senha alterada. Entre com a senha nova.' });
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <BrandLogo size={64} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold">LinkHub</h1>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          {status === 'checking' && (
            <CardContent role="status" className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin mb-4" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Conferindo o link...</p>
            </CardContent>
          )}

          {status === 'invalid' && (
            <>
              <CardHeader className="text-center">
                <CardTitle ref={titleRef} tabIndex={-1} className="outline-none">
                  Link inválido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">{RESET_LINK_INVALID_MESSAGE}</p>
                <Button className="w-full btn-gradient-primary" onClick={goToLogin}>
                  Ir para o login
                </Button>
              </CardContent>
            </>
          )}

          {status === 'saved' && (
            <>
              <CardHeader className="text-center">
                <CardTitle ref={titleRef} tabIndex={-1} className="outline-none">
                  Senha alterada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-center text-muted-foreground">
                  A senha foi alterada, mas não conseguimos encerrar a sessão neste aparelho. Feche esta aba e
                  entre de novo com a senha nova.
                </p>
              </CardContent>
            </>
          )}

          {status === 'ready' && (
            <>
              <CardHeader className="text-center">
                <CardTitle ref={titleRef} tabIndex={-1} className="outline-none">
                  Nova senha
                </CardTitle>
                <CardDescription>Crie a senha nova da sua conta.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={NEW_PASSWORD_MIN_LENGTH}
                        aria-invalid={tooShort}
                        aria-describedby="new-password-hint"
                        className="bg-background/50 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p
                      id="new-password-hint"
                      className={tooShort ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
                    >
                      {tooShort
                        ? `A senha precisa ter pelo menos ${NEW_PASSWORD_MIN_LENGTH} caracteres.`
                        : `Mínimo de ${NEW_PASSWORD_MIN_LENGTH} caracteres`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar senha</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      aria-invalid={mismatch}
                      aria-describedby={mismatch ? 'confirm-password-hint' : undefined}
                      className="bg-background/50"
                    />
                    {mismatch && (
                      <p id="confirm-password-hint" className="text-xs text-destructive">
                        As senhas não são iguais.
                      </p>
                    )}
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full btn-gradient-primary" disabled={!valid || saving}>
                    {saving ? 'Salvando...' : 'Salvar senha nova'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default NewPassword;
