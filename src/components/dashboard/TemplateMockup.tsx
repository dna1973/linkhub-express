import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBackgroundStyle, getLinkButtonStyle } from '@/utils/linkButtonStyle';
import type { OnboardingTemplate } from './onboardingTemplates';

interface TemplateMockupProps {
  template: OnboardingTemplate;
  isSelected: boolean;
  onClick: () => void;
  /** Classes de tamanho, que mudam conforme o lugar onde o desenho aparece */
  className?: string;
}

/** Miniatura de celular gerada da própria config do modelo: o que aparece aqui é o que o perfil publica. */
export const TemplateMockup: React.FC<TemplateMockupProps> = ({ template, isSelected, onClick, className }) => {
  const textColor = template.config.colors.text || '#ffffff';
  const buttonStyle = getLinkButtonStyle(template.config, { radiusScale: 0.4 });

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Modelo ${template.name}`}
      aria-pressed={isSelected}
      className={cn(
        'relative rounded-2xl overflow-hidden transition-all duration-300',
        'hover:scale-105 hover:shadow-xl',
        isSelected ? 'ring-4 ring-primary shadow-xl scale-105' : 'ring-1 ring-border/30 hover:ring-primary/50',
        className
      )}
    >
      <div
        className="w-full h-full flex flex-col items-center pt-6 px-3 pb-3"
        style={{ background: getBackgroundStyle(template.config) }}
      >
        <div className="w-10 h-10 rounded-full bg-white/30 border-2 border-white/50 mb-2" />
        <div
          className="text-[10px] font-bold mb-0.5 truncate w-full text-center"
          style={{ color: textColor, fontFamily: template.font }}
        >
          Seu Nome
        </div>
        <div className="text-[7px] opacity-70 mb-3 truncate w-full text-center" style={{ color: textColor }}>
          Sua bio aqui
        </div>
        <div className="w-full space-y-1.5">
          {['Meu site', 'YouTube', 'Instagram'].map((label) => (
            <div
              key={label}
              className="w-full h-5 flex items-center justify-center text-[7px] font-medium"
              style={{ ...buttonStyle, fontFamily: template.font }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 bg-black/50 backdrop-blur-sm py-1">
        <p className="text-[9px] text-white text-center font-medium">{template.name}</p>
      </div>
    </button>
  );
};
