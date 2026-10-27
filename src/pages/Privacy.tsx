import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <article className="prose prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
          <p className="text-muted-foreground mb-8">Última atualização: Outubro 2026</p>

          <section className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold">1. Dados Coletados</h2>
            <p className="text-muted-foreground">
              Coletamos apenas os dados necessários para o funcionamento do serviço: email, nome, foto de perfil (opcional) e links que você adiciona. Para analytics, coletamos dados anônimos de visualização como país, dispositivo e referrer.
            </p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold">2. Uso dos Dados</h2>
            <p className="text-muted-foreground">
              Seus dados são utilizados exclusivamente para fornecer e melhorar o serviço. Não vendemos, compartilhamos ou transferimos seus dados pessoais a terceiros, exceto quando exigido por lei.
            </p>
            <p className="text-muted-foreground">
              Para mostrar o ícone de alguns links nas páginas públicas, o navegador de quem visita a página busca o ícone do site (favicon) no serviço público de favicons do Google. Nessa consulta, o Google recebe o endereço IP do visitante e o domínio do link.
            </p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold">3. Perfil Público</h2>
            <p className="text-muted-foreground">
              As informações que você adiciona ao seu perfil público (nome, bio, links) são visíveis para qualquer pessoa que acesse sua página. Não inclua informações sensíveis no seu perfil público.
            </p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold">4. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground">
              Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direito a: acessar seus dados, corrigir dados incorretos, solicitar exclusão, revogar consentimento e solicitar portabilidade dos dados.
            </p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold">5. Segurança</h2>
            <p className="text-muted-foreground">
              Utilizamos criptografia, autenticação segura e políticas de acesso restrito (Row Level Security) para proteger seus dados. Senhas são armazenadas com hash seguro e nunca em texto plano.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Contato</h2>
            <p className="text-muted-foreground">
              Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato conosco através do email disponível no rodapé da aplicação.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
};

export default Privacy;
