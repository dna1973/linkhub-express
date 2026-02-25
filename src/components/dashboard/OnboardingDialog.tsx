import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Megaphone, Briefcase, User } from 'lucide-react';

interface OnboardingDialogProps {
  open: boolean;
  onComplete: (userType: string) => void;
}

const USER_TYPES = [
  {
    id: 'creator',
    title: 'Criador',
    description: 'Aumentar meus seguidores e explorar maneiras de monetizar meu público.',
    icon: Megaphone,
    gradient: 'from-pink-500 to-yellow-400',
    iconColor: 'text-pink-600',
    bgIcon: 'bg-gradient-to-br from-yellow-300 to-pink-400',
  },
  {
    id: 'business',
    title: 'Negócios',
    description: 'Expandir meu negócio e alcançar mais clientes.',
    icon: Briefcase,
    gradient: 'from-purple-500 to-indigo-400',
    iconColor: 'text-purple-600',
    bgIcon: 'bg-gradient-to-br from-purple-300 to-indigo-400',
  },
  {
    id: 'personal',
    title: 'Pessoal',
    description: 'Compartilhar links com meus amigos e conhecidos.',
    icon: User,
    gradient: 'from-orange-400 to-blue-500',
    iconColor: 'text-blue-600',
    bgIcon: 'bg-gradient-to-br from-orange-300 to-blue-400',
  },
] as const;

export const OnboardingDialog: React.FC<OnboardingDialogProps> = ({ open, onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: selected })
        .eq('id', user.id);

      if (error) throw error;

      onComplete(selected);
      toast({ title: 'Bem-vindo!', description: 'Sua experiência foi personalizada.' });
    } catch (error) {
      console.error('Error saving user type:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-1.5 w-12 rounded-full bg-primary" />
          </div>
          <DialogTitle className="text-xl">Como você pretende usar o LinkHub?</DialogTitle>
          <DialogDescription>
            Isso nos ajuda a personalizar sua experiência.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {USER_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selected === type.id;

            return (
              <button
                key={type.id}
                onClick={() => setSelected(type.id)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                  'hover:shadow-md hover:scale-[1.01]',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md scale-[1.01]'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{type.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{type.description}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center shrink-0', type.bgIcon)}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </button>
            );
          })}
        </div>

        <Button
          className="w-full mt-4"
          size="lg"
          disabled={!selected || saving}
          onClick={handleConfirm}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continuar
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export const USER_TYPE_LABELS: Record<string, string> = {
  creator: 'Criador',
  business: 'Negócios',
  personal: 'Pessoal',
};
