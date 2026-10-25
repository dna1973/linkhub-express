import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { useUsernameValidation } from '@/hooks/useUsernameValidation';
import { cn } from '@/lib/utils';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Perfil que está sendo editado: o @ dele conta como disponível. Sem ele, é um perfil novo. */
  currentProfileId?: string | null;
}

export const UsernameInput: React.FC<UsernameInputProps> = ({
  value,
  onChange,
  label = "Username",
  placeholder = "seuusername",
  className,
  disabled = false,
  currentProfileId,
}) => {
  const validation = useUsernameValidation(value, 500, currentProfileId);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    onChange(newValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
  };

  const getInputStatus = () => {
    if (!value) return 'default';
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
      <Label htmlFor="username">{label}</Label>
      
      <div className="relative">
        {/* @ Symbol */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          @
        </span>
        
        {/* Input */}
        <Input
          id="username"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className={getInputClassName()}
          maxLength={20}
        />
        
        {/* Status Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {getStatusIcon()}
        </div>
      </div>

      {/* Status Messages */}
      <div className="min-h-[20px]">
        {validation.isChecking && (
          <p className="text-xs text-blue-600 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verificando disponibilidade...
          </p>
        )}
        
        {validation.error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validation.error}
          </p>
        )}
        
        {validation.isValid && validation.isAvailable && (
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