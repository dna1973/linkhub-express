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
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  // O estado só desabilita o botão no próximo render; a ref barra o segundo envio já no mesmo
  const savingRef = useRef(false);
  const leavingRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const linkError = getRecoveryLinkError();
    let active = true;
    const apply = (session: Session | null) => {
      // Durante a gravação ou a saída, o USER_UPDATED e o SIGNED_OUT do próprio fluxo não mexem na tela
      if (!active || savingRef.current || leavingRef.current) return;
      sessionRef.current = session;
      const ready = !linkError && isRecoverySession(session);
      setStatus((prev) => (prev === 'saved' ? prev : ready ? 'ready' : 'invalid'));
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    // O getSession espera o supabase-js terminar de ler o link, mas resolve antes do
    // PASSWORD_RECOVERY, que o auth-js manda num setTimeout(0) agendado antes. Esperar um
    // setTimeout(0) aqui deixa o evento (e a marca) chegar primeiro: sem piscar "link inválido".
    supabase.auth
      .getSession()
      .then(({ data }) => setTimeout(() => apply(data?.session ?? null), 0))
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

  /**
   * Volta ao login. Com a marca de recuperação valendo para esta sessão (ou sem sessão legível,
   * como num refresh que falhou com o usuário ainda no contexto), sai neste aparelho antes: o
   * /auth mandaria a conta marcada de volta para cá. Se a saída falhar, fica aqui com aviso, em
   * vez de entrar no ciclo /auth ↔ /auth/nova-senha. Sessão comum de outra conta não é tocada.
   */
  const leaveToLogin = async () => {
    if (leavingRef.current) return;
    const markedId = getRecoveryUserId();
    const session = sessionRef.current;
    if (markedId && (!session || session.user?.id === markedId)) {
      leavingRef.current = true;
      setLeaving(true);
      setLeaveError(null);
      let signedOut = false;
      try {
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        signedOut = !signOutError;
      } catch {
        signedOut = false;
      }
      leavingRef.current = false;
      setLeaving(false);
      if (!signedOut) {
        setLeaveError('Sem conexão. Tente de novo.');
        return;
      }
      forgetRecoveryUser();
    }
    navigate('/auth', { replace: true });
  };

  const leaveErrorMessage = leaveError && (
    <p role="alert" className="text-sm text-center text-destructive">
      {leaveError}
    </p>
  );

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
                {leaveErrorMessage}
                <Button className="w-full btn-gradient-primary" onClick={leaveToLogin} disabled={leaving}>
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
              <CardContent className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">
                  A senha foi alterada, mas não conseguimos encerrar a sessão neste aparelho. Confira a conexão e
                  tente sair de novo; até lá, o login traz você de volta para esta página.
                </p>
                {leaveErrorMessage}
                <Button className="w-full btn-gradient-primary" onClick={leaveToLogin} disabled={leaving}>
                  Tentar sair de novo
                </Button>
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
                  {leaveErrorMessage}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={leaveToLogin}
                    disabled={saving || leaving}
                  >
                    Cancelar e voltar ao login
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
