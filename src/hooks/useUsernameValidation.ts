import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UsernameValidationResult {
  isValid: boolean;
  isAvailable: boolean;
  isChecking: boolean;
  error: string | null;
  suggestions: string[];
}

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
  const [result, setResult] = useState<UsernameValidationResult>({
    isValid: false,
    isAvailable: false,
    isChecking: false,
    error: null,
    suggestions: []
  });

  const validateUsername = useCallback(async (usernameToCheck: string) => {
    // Reset state
    setResult(prev => ({ ...prev, isChecking: true, error: null, suggestions: [] }));

    // Basic validation
    if (!usernameToCheck) {
      setResult({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        error: null,
        suggestions: []
      });
      return;
    }

    // Username format validation
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(usernameToCheck)) {
      setResult({
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
      setResult({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        error: 'Este username é reservado pelo sistema',
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
        setResult({
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

      setResult({
        isValid: true,
        isAvailable,
        isChecking: false,
        error: isAvailable ? null : 'Este username já está em uso',
        suggestions
      });

    } catch (error) {
      console.error('Username validation error:', error);
      setResult({
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
    if (!username) {
      setResult({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        error: null,
        suggestions: []
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      validateUsername(username);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [username, debounceMs, validateUsername]);

  return result;
};
