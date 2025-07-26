# Guia de Contribuição

## Como Contribuir

Obrigado pelo interesse em contribuir com o LinkHub! Este guia irá ajudá-lo a começar.

## 🚀 Primeiros Passos

### 1. Fork e Clone
```bash
# Fork o repositório no GitHub
# Clone seu fork
git clone https://github.com/SEU_USERNAME/linkhub.git
cd linkhub

# Adicione o repositório original como upstream
git remote add upstream https://github.com/ORIGINAL_OWNER/linkhub.git
```

### 2. Configuração do Ambiente
```bash
# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas configurações

# Execute o projeto
npm run dev
```

### 3. Estrutura de Branches
```bash
# Crie uma branch para sua feature
git checkout -b feature/nome-da-feature

# Ou para bugfix
git checkout -b fix/nome-do-bug

# Ou para documentação
git checkout -b docs/nome-da-doc
```

## 📝 Padrões de Código

### TypeScript
- Use TypeScript para todos os arquivos
- Defina interfaces para props e dados
- Use tipos explícitos quando necessário

```typescript
// ✅ Bom
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', onClick }) => {
  return (
    <button 
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// ❌ Evitar
const Button = ({ children, variant, onClick }: any) => {
  // ...
};
```

### Componentes React
- Use componentes funcionais com hooks
- Prefira composition over inheritance
- Mantenha componentes pequenos e focados

```typescript
// ✅ Bom - Componente focado
const LinkCard = ({ link, onEdit, onDelete }: LinkCardProps) => {
  return (
    <Card>
      <CardContent>
        <h3>{link.title}</h3>
        <p>{link.url}</p>
        <div className="actions">
          <Button onClick={() => onEdit(link.id)}>Editar</Button>
          <Button onClick={() => onDelete(link.id)}>Deletar</Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ❌ Evitar - Componente muito grande
const LinkManager = () => {
  // 200+ linhas de código
  // Múltiplas responsabilidades
};
```

### Styling
- Use Tailwind CSS para estilização
- Prefira classes utilitárias
- Use componentes do shadcn/ui quando possível

```typescript
// ✅ Bom
<div className="flex items-center justify-between p-4 bg-card rounded-lg border">
  <h2 className="text-lg font-semibold">Título</h2>
  <Button variant="outline" size="sm">Ação</Button>
</div>

// ❌ Evitar CSS customizado desnecessário
<div className="custom-card-style">
  <h2 className="custom-title">Título</h2>
</div>
```

### Hooks Customizados
- Extraia lógica reutilizável em hooks
- Use prefixo `use` para hooks
- Documente hooks complexos

```typescript
// ✅ Bom
export const useLinks = (profileId: string) => {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('links')
        .select('*')
        .eq('profile_id', profileId)
        .order('position');
      
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return { links, loading, refetch: fetchLinks };
};
```

## 🧪 Testes

### Estrutura de Testes
```bash
src/
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx
├── hooks/
│   ├── useLinks.ts
│   └── __tests__/
│       └── useLinks.test.ts
└── utils/
    ├── helpers.ts
    └── __tests__/
        └── helpers.test.ts
```

### Exemplo de Teste
```typescript
// src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct variant class', () => {
    render(<Button variant="secondary">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });
});
```

### Executar Testes
```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm test -- --watch

# Executar testes com coverage
npm test -- --coverage
```

## 📋 Processo de Pull Request

### 1. Antes de Submeter
- [ ] Código segue os padrões estabelecidos
- [ ] Testes passando
- [ ] Documentação atualizada
- [ ] Sem conflitos com a branch main

### 2. Checklist do PR
```markdown
## Descrição
Breve descrição das mudanças

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Testes
- [ ] Testes existentes passando
- [ ] Novos testes adicionados
- [ ] Testado manualmente

## Screenshots (se aplicável)
[Adicione screenshots das mudanças visuais]

## Checklist
- [ ] Código revisado
- [ ] Documentação atualizada
- [ ] Sem console.logs desnecessários
- [ ] Variáveis e funções bem nomeadas
```

### 3. Template de Commit
```bash
# Formato: tipo(escopo): descrição

# Tipos:
# feat: nova funcionalidade
# fix: correção de bug
# docs: documentação
# style: formatação, sem mudança de código
# refactor: refatoração de código
# test: adição ou correção de testes
# chore: tarefas de build, configuração, etc.

# Exemplos:
git commit -m "feat(analytics): add click tracking dashboard"
git commit -m "fix(auth): resolve login redirect issue"
git commit -m "docs(api): update authentication endpoints"
```

## 🐛 Reportando Bugs

### Template de Issue
```markdown
## Descrição do Bug
Descrição clara e concisa do bug

## Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Role para baixo até '...'
4. Veja o erro

## Comportamento Esperado
Descrição do que deveria acontecer

## Comportamento Atual
Descrição do que está acontecendo

## Screenshots
Se aplicável, adicione screenshots

## Ambiente
- OS: [ex: Windows 10]
- Browser: [ex: Chrome 91]
- Versão: [ex: 1.0.0]

## Informações Adicionais
Qualquer outra informação relevante
```

## 💡 Sugerindo Features

### Template de Feature Request
```markdown
## Resumo da Feature
Descrição clara e concisa da feature

## Problema que Resolve
Explique o problema que esta feature resolveria

## Solução Proposta
Descrição detalhada da solução

## Alternativas Consideradas
Outras soluções que foram consideradas

## Informações Adicionais
Mockups, exemplos, referências, etc.
```

## 🏗 Arquitetura e Padrões

### Estrutura de Pastas
```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (shadcn/ui)
│   └── dashboard/      # Componentes específicos
├── contexts/           # React Contexts
├── hooks/              # Custom hooks
├── lib/                # Utilitários e configurações
├── pages/              # Páginas da aplicação
├── stores/             # Zustand stores
├── types/              # Definições de tipos
└── utils/              # Funções utilitárias
```

### Padrões de Nomenclatura
```typescript
// Componentes: PascalCase
const UserProfile = () => {};

// Hooks: camelCase com prefixo 'use'
const useUserData = () => {};

// Constantes: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';

// Funções: camelCase
const formatDate = (date: Date) => {};

// Tipos/Interfaces: PascalCase
interface UserProfile {
  id: string;
  name: string;
}
```

### Error Handling
```typescript
// ✅ Bom - Error handling consistente
const fetchUserData = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in fetchUserData:', error);
    throw error; // Re-throw para o componente tratar
  }
};

// No componente
const UserComponent = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserData(userId)
      .then(setUser)
      .catch(setError);
  }, [userId]);

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return user ? <UserProfile user={user} /> : <Loading />;
};
```

## 🔧 Ferramentas de Desenvolvimento

### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "off"
  }
}
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Husky Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

## 📚 Recursos Úteis

### Documentação
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Supabase Docs](https://supabase.com/docs)

### Ferramentas
- [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
- [VS Code Extensions](https://code.visualstudio.com/docs/editor/extension-marketplace)

## 🤝 Comunidade

### Canais de Comunicação
- GitHub Issues: Para bugs e feature requests
- GitHub Discussions: Para perguntas e discussões
- Discord: Para chat em tempo real (se disponível)

### Código de Conduta
- Seja respeitoso e inclusivo
- Mantenha discussões construtivas
- Ajude outros desenvolvedores
- Reporte comportamentos inadequados

## 🎉 Reconhecimento

Contribuidores são reconhecidos através de:
- Lista de contribuidores no README
- Menções em releases
- Badges especiais (para contribuições significativas)

Obrigado por contribuir com o LinkHub! 🚀