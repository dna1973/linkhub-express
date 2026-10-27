import React, { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import type { UsernameValidationResult } from '@/hooks/useUsernameValidation';
import { cn } from '@/lib/utils';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Id do campo. Sem ele, um gerado (dois UsernameInput na mesma página não se confundem). */
  id?: string;
  /** Resultado do useUsernameValidation de quem roda o hook para o mesmo @ (uma consulta por @). */
  validation: UsernameValidationResult;
  /** Erro de fora da validação (ex.: o banco recusou o @ ao gravar). Esconde o "disponível". */
  error?: string | null;
}

export const UsernameInput: React.FC<UsernameInputProps> = ({
  value,
  onChange,
  label = "Username",
  placeholder = "seuusername",
  className,
  disabled = false,
  id,
  validation,
  error,
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  // O erro de fora tem prioridade sobre o da validação; com qualquer um, nada de "disponível"
  const shownError = error || validation.error;
  const isAvailableShown = !shownError && !validation.isChecking && validation.isValid && validation.isAvailable;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    onChange(newValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
  };

  const getInputStatus = () => {
    if (!value) return 'default';
    if (error) return 'error';
    if (validation.isChecking) return 'checking';
    if (validation.error) return 'error';
    if (validation.isValid && validation.isAvailable) return 'success';
    return 'default';
  };

  const getStatusIcon = () => {
    const status = getInputStatus();
    switch (status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getInputClassName = () => {
    const status = getInputStatus();
    const baseClasses = "pl-8 pr-10";

    switch (status) {
      case 'success':
        return cn(baseClasses, "border-green-500 focus:border-green-500 focus:ring-green-500");
      case 'error':
        return cn(baseClasses, "border-red-500 focus:border-red-500 focus:ring-red-500");
      case 'checking':
        return cn(baseClasses, "border-blue-500 focus:border-blue-500 focus:ring-blue-500");
      default:
        return baseClasses;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={inputId}>{label}</Label>

      <div className="relative">
        {/* @ Symbol */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          @
        </span>

        {/* Input */}
        <Input
          id={inputId}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className={getInputClassName()}
          maxLength={20}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? errorId : undefined}
        />

        {/* Status Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {getStatusIcon()}
        </div>
      </div>

      {/* Status Messages */}
      <div className="min-h-[20px]">
        {validation.isChecking && !error && (
          <p className="text-xs text-blue-600 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verificando disponibilidade...
          </p>
        )}

        {shownError && (
          <p id={errorId} role={error ? 'alert' : undefined} className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" aria-hidden />
            {shownError}
          </p>
        )}

        {isAvailableShown && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Username disponível!
          </p>
        )}
      </div>

      {/* Suggestions */}
      {validation.suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Sugestões disponíveis:</p>
          <div className="flex flex-wrap gap-2">
            {validation.suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="h-6 px-2 text-xs"
              >
                @{suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground">
        3-20 caracteres • Apenas letras minúsculas, números e underscore
      </p>
    </div>
  );
};
