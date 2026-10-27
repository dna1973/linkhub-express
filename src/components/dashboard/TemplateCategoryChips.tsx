import React from 'react';
import { cn } from '@/lib/utils';
import { TEMPLATE_FILTERS } from './onboardingTemplates';
import type { TemplateFilter } from './onboardingTemplates';

interface TemplateCategoryChipsProps {
  value: TemplateFilter;
  onChange: (value: TemplateFilter) => void;
  className?: string;
}

/** Linha de chips para filtrar os modelos por estilo. Usada no onboarding e na aba Modelos. */
export const TemplateCategoryChips: React.FC<TemplateCategoryChipsProps> = ({ value, onChange, className }) => (
  <div role="group" aria-label="Filtrar modelos por estilo" className={cn('flex flex-wrap gap-2', className)}>
    {TEMPLATE_FILTERS.map((filter) => {
      const active = value === filter.id;
      return (
        <button
          key={filter.id}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(filter.id)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            active
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
          )}
        >
          {filter.label}
        </button>
      );
    })}
  </div>
);
