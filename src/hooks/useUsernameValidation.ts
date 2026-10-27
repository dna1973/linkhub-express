import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface UsernameValidationResult {
  isValid: boolean;
  isAvailable: boolean;
  isChecking: boolean;
  error: string | null;
  suggestions: string[];
  /**
   * O @ a que isValid/isAvailable se referem. Enquanto o @ digitado ainda não foi conferido
   * (debounce ou consulta em andamento), é o anterior: quem libera uma ação compara com o atual.
   */
  checkedUsername: string;
}

type CheckResult = Omit<UsernameValidationResult, 'checkedUsername'>;

const EMPTY_RESULT: UsernameValidationResult = {
  isValid: false,
  isAvailable: false,
  isChecking: false,
  error: null,
  suggestions: [],
  checkedUsername: '',
};

// A mesma lista fica no create_profile de deploy/vpsavila/migrations/2026-10-26-varios-perfis.sql
// (conferida em src/lib/variosPerfisMigration.test.ts). Mudou aqui, mude lá e no linkhub_schema.sql.
export const RESERVED_USERNAMES = [
  'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'dashboard',
  'analytics', 'settings', 'profile', 'user', 'users', 'auth',
  'login', 'register', 'signup', 'signin', 'logout', 'home',
  'about', 'contact', 'help', 'support', 'terms', 'privacy',
  'blog', 'news', 'app', 'mobile', 'web', 'site', 'page',
  'linkhub', 'link', 'links', 'hub', 'tree', 'bio', 'me',
  // Rotas do app (src/App.tsx): um perfil com esse @ ficaria escondido atrás da rota
  'exemplo', 'install'
];

/**
 * Valida o formato, os nomes reservados e a disponibilidade de um @username.
 * `currentProfileId`: o @ que já é desse perfil conta como disponível. Sem ele (perfil novo),
 * um @ gravado em qualquer perfil, inclusive outro da mesma conta, está em uso.
 */
export const useUsernameValidation = (
  username: string,
  debounceMs: number = 500,
  currentProfileId?: string | null,
) => {
  const [result, setResultState] = useState<UsernameValidationResult>(EMPTY_RESULT);
  // Cada @ (ou troca de perfil atual) ganha um número; só a resposta do último é gravada
  const requestRef = useRef(0);

  const validateUsername = useCallback(async (usernameToCheck: string, requestId: number) => {
    const finish = (checked: CheckResult) => {
      if (requestRef.current !== requestId) return;
      setResultState({ ...checked, checkedUsername: usernameToCheck });
    };

    // Username format validation
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(usernameToCheck)) {
      finish({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        error: 'Username deve ter 3-20 caracteres (apenas letras minúsculas, números e underscore)',
        suggestions: []
      });
      return;
    }

    if (RESERVED_USERNAMES.includes(usernameToCheck.toLowerCase())) {
      const suggestions = generateSuggestions(usernameToCheck);
      finish({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        // O mesmo texto do diálogo de perfil novo e da recusa do create_profile
        error: 'Este @username não pode ser usado',
        suggestions
      });
      return;
    }

    try {
      // Check if username exists in database
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', usernameToCheck);

      if (error) {
        console.error('Error checking username:', error);
        finish({
          isValid: false,
          isAvailable: false,
          isChecking: false,
          error: 'Erro ao verificar disponibilidade do username',
          suggestions: []
        });
        return;
      }

      // Disponível se ninguém usa, ou se quem usa é o próprio perfil
      const existingProfile = data && data.length > 0 ? data[0] : null;
      const isAvailable = !existingProfile || (!!currentProfileId && existingProfile.id === currentProfileId);
      const suggestions = isAvailable ? [] : generateSuggestions(usernameToCheck);

      finish({
        isValid: true,
        isAvailable,
        isChecking: false,
        error: isAvailable ? null : 'Este username já está em uso',
        suggestions
      });

    } catch (error) {
      console.error('Username validation error:', error);
      finish({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        error: 'Erro ao verificar username',
        suggestions: []
      });
    }
  }, [currentProfileId]);

  const generateSuggestions = (baseUsername: string): string[] => {
    const suggestions: string[] = [];
    const base = baseUsername.toLowerCase();

    // Add numbers
    for (let i = 1; i <= 99; i++) {
      suggestions.push(`${base}${i}`);
      if (suggestions.length >= 3) break;
    }

    // Add underscores
    suggestions.push(`${base}_`);
    suggestions.push(`_${base}`);

    // Add common suffixes
    const suffixes = ['official', 'real', 'pro', 'dev', 'hub'];
    suffixes.forEach(suffix => {
      if (suggestions.length < 5) {
        suggestions.push(`${base}_${suffix}`);
      }
    });

    return suggestions.slice(0, 5);
  };

  // Debounced validation
  useEffect(() => {
    const requestId = ++requestRef.current;
    if (!username) {
      setResultState(EMPTY_RESULT);
      return;
    }

    // "Verificando" já durante o debounce; isValid/isAvailable seguem os do checkedUsername anterior
    setResultState(prev => ({ ...prev, isChecking: true, error: null, suggestions: [] }));
    const timeoutId = setTimeout(() => {
      validateUsername(username, requestId);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [username, debounceMs, validateUsername]);

  return result;
};
