import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { GoogleIcon } from '@/components/ui/google-icon';
import { supabase, PUBLIC_SITE_URL } from '@/lib/supabase';
import {
  NEW_PASSWORD_PATH,
  RESET_EMAIL_SENT_MESSAGE,
  isValidEmail,
  resetRequestErrorMessage,
} from '@/lib/passwordRecovery';

/** "Esqueci minha senha": só o e-mail; a resposta é a mesma exista ou não a conta. */
const ForgotPasswordForm = ({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) => {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // O estado só desabilita o botão no próximo render; a ref barra o segundo clique já no mesmo
  const sendingRef = useRef(false);
  const valid = isValidEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    setSent(false);
    let message: string | null;
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${PUBLIC_SITE_URL}${NEW_PASSWORD_PATH}`,
      });
      message = resetRequestErrorMessage(resetError);
    } catch {
      message = resetRequestErrorMessage({ message: 'network' });
    }
    if (message) setError(message);
    else setSent(true);
    sendingRef.current = false;
    setSending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Esqueci minha senha</h2>
        <p className="text-sm text-muted-foreground">
          Informe o e-mail da conta. Se ele estiver cadastrado, você recebe um link para criar uma senha nova.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-invalid={email.trim() !== '' && !valid}
          className="bg-background/50"
        />
        {email.trim() !== '' && !valid && (
          <p className="text-xs text-destructive">Digite um e-mail válido, como nome@exemplo.com.</p>
        )}
      </div>
      {sent && (
        <p role="status" className="text-sm rounded-md border border-border/50 bg-muted/50 p-3">
          {RESET_EMAIL_SENT_MESSAGE}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full btn-gradient-primary" disabled={!valid || sending}>
        {sending ? 'Enviando link...' : 'Enviar link'}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack} disabled={sending}>
        Voltar para o login
      </Button>
    </form>
  );
};


const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Erro no login",
        description: error.message === "Invalid login credentials" 
          ? "Credenciais inválidas. Verifique seu email e senha."
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta ao LinkHub.",
      });
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message === "User already registered" 
          ? "Este email já está cadastrado. Tente fazer login."
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu email para confirmar a conta.",
      });
    }
    
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        toast({
          title: "Erro no login",
          description: "Erro ao fazer login com Google. Tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
      }
    } catch (err) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="text-center space-y-2">
          <BrandLogo size={64} className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold">LinkHub</h1>
          <p className="text-muted-foreground">Sua página de links personalizada</p>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center">
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>
              Entre com suas credenciais ou crie uma nova conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                {forgotPassword ? (
                  <ForgotPasswordForm initialEmail={email} onBack={() => setForgotPassword(false)} />
                ) : (
                <div className="space-y-4">
                  {/* Social Login Buttons */}
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-background/50 hover:bg-background/80"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                    >
                      <GoogleIcon className="w-5 h-5 mr-2" />
                      Continuar com Google
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Ou continue com email
                      </span>
                    </div>
                  </div>

                  {/* Email/Password Form */}
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="bg-background/50 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full btn-gradient-primary hover-bounce"
                      disabled={loading}
                    >
                      {loading ? "Entrando..." : "Entrar"}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-sm text-muted-foreground"
                        onClick={() => setForgotPassword(true)}
                      >
                        Esqueci minha senha
                      </Button>
                    </div>
                  </form>
                </div>
                )}
              </TabsContent>
              
              <TabsContent value="signup">
                <div className="space-y-4">
                  {/* Social Login Buttons */}
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-background/50 hover:bg-background/80"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                    >
                      <GoogleIcon className="w-5 h-5 mr-2" />
                      Cadastrar com Google
                    </Button>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Ou cadastre-se com email
                      </span>
                    </div>
                  </div>

                  {/* Email/Password Form */}
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="bg-background/50 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Mínimo de 6 caracteres
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full btn-gradient-primary hover-bounce"
                      disabled={loading}
                    >
                      {loading ? "Criando conta..." : "Criar conta"}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;