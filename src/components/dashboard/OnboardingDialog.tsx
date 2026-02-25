import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Megaphone, Briefcase, User, ArrowLeft, ArrowRight, Check, Instagram, Youtube, Facebook, Linkedin, Github, Globe, Mail, Music, MessageCircle, ShoppingBag, Plus } from 'lucide-react';
import { ThemeConfig } from '@/stores/useDesignStore';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
    bgIcon: 'bg-gradient-to-br from-yellow-300 to-pink-400',
  },
  {
    id: 'business',
    title: 'Negócios',
    description: 'Expandir meu negócio e alcançar mais clientes.',
    icon: Briefcase,
    bgIcon: 'bg-gradient-to-br from-purple-300 to-indigo-400',
  },
  {
    id: 'personal',
    title: 'Pessoal',
    description: 'Compartilhar links com meus amigos e conhecidos.',
    icon: User,
    bgIcon: 'bg-gradient-to-br from-orange-300 to-blue-400',
  },
] as const;

export const ONBOARDING_TEMPLATES = [
  {
    id: 'warm-peach',
    name: 'Peach',
    bg: 'linear-gradient(180deg, #FDDCB5 0%, #F8C4A0 100%)',
    textColor: '#3D2B1F',
    btnBg: '#F5A876',
    btnText: '#3D2B1F',
    btnRadius: '12px',
    font: 'Poppins, sans-serif',
    config: {
      background: { type: 'gradient' as const, colors: ['#FDDCB5', '#F8C4A0'] },
      buttonStyle: { type: 'solid' as const, color: '#F5A876', borderRadius: 'lg' as const },
      font: { family: 'poppins' as const, size: 'md' as const, weight: 'medium' as const },
      colors: { primary: '#3D2B1F', secondary: '#5C3D2E', accent: '#F5A876', text: '#3D2B1F' },
    },
  },
  {
    id: 'clean-white',
    name: 'Clean',
    bg: '#FFFFFF',
    textColor: '#1A1A1A',
    btnBg: '#F5F5F5',
    btnText: '#1A1A1A',
    btnRadius: '24px',
    font: 'Inter, sans-serif',
    config: {
      background: { type: 'solid' as const, colors: ['#FFFFFF', '#F9FAFB'] },
      buttonStyle: { type: 'outline' as const, color: '#E5E7EB', borderRadius: 'full' as const },
      font: { family: 'inter' as const, size: 'md' as const, weight: 'normal' as const },
      colors: { primary: '#1A1A1A', secondary: '#6B7280', accent: '#3B82F6', text: '#1A1A1A' },
    },
  },
  {
    id: 'ocean-deep',
    name: 'Ocean',
    bg: 'linear-gradient(180deg, #0891B2 0%, #1E40AF 100%)',
    textColor: '#FFFFFF',
    btnBg: 'rgba(255,255,255,0.15)',
    btnText: '#FFFFFF',
    btnRadius: '8px',
    font: 'Montserrat, sans-serif',
    config: {
      background: { type: 'gradient' as const, colors: ['#0891B2', '#1E40AF'] },
      buttonStyle: { type: 'glass' as const, color: '#22D3EE', borderRadius: 'md' as const },
      font: { family: 'montserrat' as const, size: 'md' as const, weight: 'medium' as const },
      colors: { primary: '#22D3EE', secondary: '#67E8F9', accent: '#0EA5E9', text: '#FFFFFF' },
    },
  },
  {
    id: 'sunset-warm',
    name: 'Sunset',
    bg: 'linear-gradient(180deg, #F59E0B 0%, #DC2626 100%)',
    textColor: '#FFFFFF',
    btnBg: 'rgba(255,255,255,0.2)',
    btnText: '#FFFFFF',
    btnRadius: '999px',
    font: 'Playfair Display, serif',
    config: {
      background: { type: 'gradient' as const, colors: ['#F59E0B', '#DC2626'] },
      buttonStyle: { type: 'outline' as const, color: '#FFFFFF', borderRadius: 'full' as const },
      font: { family: 'playfair' as const, size: 'lg' as const, weight: 'bold' as const },
      colors: { primary: '#FFFFFF', secondary: '#FEF3C7', accent: '#FBBF24', text: '#FFFFFF' },
    },
  },
  {
    id: 'midnight-dark',
    name: 'Midnight',
    bg: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
    textColor: '#E2E8F0',
    btnBg: '#334155',
    btnText: '#E2E8F0',
    btnRadius: '12px',
    font: 'Inter, sans-serif',
    config: {
      background: { type: 'gradient' as const, colors: ['#0F172A', '#1E293B'] },
      buttonStyle: { type: 'glass' as const, color: '#3B82F6', borderRadius: 'lg' as const },
      font: { family: 'inter' as const, size: 'md' as const, weight: 'normal' as const },
      colors: { primary: '#3B82F6', secondary: '#64748B', accent: '#06B6D4', text: '#FFFFFF' },
    },
  },
  {
    id: 'forest-green',
    name: 'Forest',
    bg: 'linear-gradient(180deg, #065F46 0%, #064E3B 100%)',
    textColor: '#D1FAE5',
    btnBg: 'rgba(16,185,129,0.25)',
    btnText: '#6EE7B7',
    btnRadius: '12px',
    font: 'Roboto Mono, monospace',
    config: {
      background: { type: 'gradient' as const, colors: ['#065F46', '#064E3B'] },
      buttonStyle: { type: 'glass' as const, color: '#10B981', borderRadius: 'lg' as const },
      font: { family: 'roboto-mono' as const, size: 'md' as const, weight: 'normal' as const },
      colors: { primary: '#10B981', secondary: '#6EE7B7', accent: '#34D399', text: '#FFFFFF' },
    },
  },
  {
    id: 'cyber-neon',
    name: 'Neon',
    bg: 'linear-gradient(180deg, #0C0C0C 0%, #1A1A2E 100%)',
    textColor: '#00FF88',
    btnBg: 'transparent',
    btnText: '#00FF88',
    btnRadius: '0px',
    font: 'Source Code Pro, monospace',
    config: {
      background: { type: 'gradient' as const, colors: ['#0C0C0C', '#1A1A2E'] },
      buttonStyle: { type: 'outline' as const, color: '#00FF88', borderRadius: 'none' as const },
      font: { family: 'source-code-pro' as const, size: 'md' as const, weight: 'bold' as const },
      colors: { primary: '#00FF88', secondary: '#00CCFF', accent: '#FF0066', text: '#FFFFFF' },
    },
  },
  {
    id: 'rose-elegant',
    name: 'Rose',
    bg: 'linear-gradient(180deg, #FFF1F2 0%, #FFE4E6 100%)',
    textColor: '#881337',
    btnBg: '#FB7185',
    btnText: '#FFFFFF',
    btnRadius: '999px',
    font: 'Lora, serif',
    config: {
      background: { type: 'gradient' as const, colors: ['#FFF1F2', '#FFE4E6'] },
      buttonStyle: { type: 'solid' as const, color: '#FB7185', borderRadius: 'full' as const },
      font: { family: 'lora' as const, size: 'md' as const, weight: 'medium' as const },
      colors: { primary: '#881337', secondary: '#BE185D', accent: '#FB7185', text: '#881337' },
    },
  },
  {
    id: 'sand-cream',
    name: 'Sand',
    bg: 'linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)',
    textColor: '#78350F',
    btnBg: '#D97706',
    btnText: '#FFFBEB',
    btnRadius: '12px',
    font: 'Poppins, sans-serif',
    config: {
      background: { type: 'gradient' as const, colors: ['#FEF3C7', '#FDE68A'] },
      buttonStyle: { type: 'solid' as const, color: '#D97706', borderRadius: 'lg' as const },
      font: { family: 'poppins' as const, size: 'md' as const, weight: 'medium' as const },
      colors: { primary: '#78350F', secondary: '#92400E', accent: '#D97706', text: '#78350F' },
    },
  },
  {
    id: 'purple-haze',
    name: 'Purple',
    bg: 'linear-gradient(180deg, #7C3AED 0%, #C026D3 100%)',
    textColor: '#FFFFFF',
    btnBg: 'rgba(255,255,255,0.2)',
    btnText: '#FFFFFF',
    btnRadius: '8px',
    font: 'Montserrat, sans-serif',
    config: {
      background: { type: 'gradient' as const, colors: ['#7C3AED', '#C026D3'] },
      buttonStyle: { type: 'solid' as const, color: '#FFFFFF', borderRadius: 'md' as const },
      font: { family: 'montserrat' as const, size: 'md' as const, weight: 'bold' as const },
      colors: { primary: '#FFFFFF', secondary: '#E9D5FF', accent: '#D946EF', text: '#FFFFFF' },
    },
  },
];

const PhoneMockup: React.FC<{
  template: typeof ONBOARDING_TEMPLATES[number];
  isSelected: boolean;
  onClick: () => void;
}> = ({ template, isSelected, onClick }) => {
  const btnBorderStyle = template.config.buttonStyle.type === 'outline'
    ? { border: `2px solid ${template.btnText}`, background: 'transparent' }
    : { background: template.btnBg };

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative rounded-2xl overflow-hidden transition-all duration-300 flex-shrink-0',
        'w-full max-w-[130px] h-[220px] sm:max-w-[140px] sm:h-[240px]',
        'hover:scale-105 hover:shadow-xl',
        isSelected
          ? 'ring-3 ring-primary shadow-xl scale-105'
          : 'ring-1 ring-border/30 hover:ring-primary/50'
      )}
    >
      <div
        className="w-full h-full flex flex-col items-center pt-6 px-3 pb-3"
        style={{ background: template.bg }}
      >
        <div className="w-10 h-10 rounded-full bg-white/30 border-2 border-white/50 mb-2" />
        <div
          className="text-[10px] font-bold mb-0.5 truncate w-full text-center"
          style={{ color: template.textColor, fontFamily: template.font }}
        >
          Seu Nome
        </div>
        <div
          className="text-[7px] opacity-70 mb-3 truncate w-full text-center"
          style={{ color: template.textColor }}
        >
          Sua bio aqui
        </div>
        <div className="w-full space-y-1.5">
          {['Meu site', 'YouTube', 'Instagram'].map((label) => (
            <div
              key={label}
              className="w-full h-5 flex items-center justify-center text-[7px] font-medium"
              style={{
                ...btnBorderStyle,
                color: template.btnText,
                borderRadius: template.btnRadius,
                fontFamily: template.font,
              }}
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

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/seuusuario', color: 'from-purple-500 to-pink-500' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@seucanal', color: 'from-red-500 to-red-600' },
  { id: 'tiktok', label: 'TikTok', icon: Music, placeholder: 'https://tiktok.com/@seuusuario', color: 'from-gray-800 to-gray-900' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, placeholder: 'https://wa.me/5511999999999', color: 'from-green-500 to-green-600' },
  { id: 'website', label: 'Site', icon: Globe, placeholder: 'https://seusite.com', color: 'from-blue-500 to-cyan-500' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/seuusuario', color: 'from-blue-600 to-blue-700' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/seuusuario', color: 'from-blue-700 to-blue-800' },
  { id: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/seuusuario', color: 'from-gray-700 to-gray-900' },
  { id: 'spotify', label: 'Spotify', icon: Music, placeholder: 'https://open.spotify.com/...', color: 'from-green-400 to-green-600' },
  { id: 'email', label: 'Email', icon: Mail, placeholder: 'mailto:seu@email.com', color: 'from-amber-500 to-orange-500' },
  { id: 'shopee', label: 'Loja Online', icon: ShoppingBag, placeholder: 'https://sualoja.com', color: 'from-orange-500 to-red-500' },
  { id: 'pinterest', label: 'Pinterest', icon: Globe, placeholder: 'https://pinterest.com/seuusuario', color: 'from-red-600 to-red-700' },
];

// Predefined avatar options
const DEFAULT_AVATARS = [
  'https://api.dicebear.com/9.x/glass/svg?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/9.x/glass/svg?seed=Aneka&backgroundColor=ffdfbf,ffd5dc',
  'https://api.dicebear.com/9.x/glass/svg?seed=Lily&backgroundColor=c0aede,d1d4f9',
];

export const OnboardingDialog: React.FC<OnboardingDialogProps> = ({ open, onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [platformUrls, setPlatformUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Profile details state (step 2)
  const [profileName, setProfileName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
  const [profileBio, setProfileBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB.', variant: 'destructive' });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const selectDefaultAvatar = (url: string) => {
    setAvatarFile(null);
    setAvatarPreview(url);
  };

  const handleNext = () => {
    if (step === 1 && selectedType) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
  };

  const uploadAvatarIfNeeded = async (): Promise<string | null> => {
    if (!user) return null;

    // If user selected a file, upload it
    if (avatarFile) {
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    }

    // If user selected a default avatar URL
    if (avatarPreview && avatarPreview !== user?.user_metadata?.avatar_url) {
      return avatarPreview;
    }

    // Keep existing or null
    return avatarPreview;
  };

  const handleFinish = async () => {
    if (!user || !selectedType) return;

    setSaving(true);
    try {
      // 1. Upload avatar if needed
      const avatarUrl = await uploadAvatarIfNeeded();

      // 2. Save user_type + template + profile details
      const template = ONBOARDING_TEMPLATES.find(t => t.id === selectedTemplate);
      const themeOptions = template
        ? { themeId: template.id, custom: template.config }
        : undefined;

      const updateData: any = { user_type: selectedType };
      if (themeOptions) updateData.theme_options = themeOptions;
      if (profileName.trim()) updateData.full_name = profileName.trim();
      if (profileBio.trim()) updateData.bio = profileBio.trim();
      if (avatarUrl) updateData.avatar_url = avatarUrl;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      if (profileError) throw profileError;

      // 3. Create links for selected platforms (only if user provided a URL)
      if (selectedPlatforms.size > 0) {
        const linksToCreate = Array.from(selectedPlatforms)
          .filter((platformId) => {
            const url = platformUrls[platformId]?.trim();
            return url && url.length > 0;
          })
          .map((platformId, index) => {
            const platform = PLATFORMS.find(p => p.id === platformId)!;
            const url = platformUrls[platformId]!.trim();
            return {
              user_id: user.id,
              title: platform.label,
              url,
              position: index,
              is_visible: true,
            };
          });

        if (linksToCreate.length > 0) {
          const { error: linksError } = await supabase
            .from('links')
            .insert(linksToCreate);
          if (linksError) throw linksError;
        }
      }

      onComplete(selectedType);
      toast({ title: 'Bem-vindo!', description: 'Seu perfil está pronto para personalizar!' });
    } catch (error) {
      console.error('Error saving onboarding:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    // Skip step 4 — finish without platforms
    if (!user || !selectedType) return;
    setSaving(true);
    try {
      const avatarUrl = await uploadAvatarIfNeeded();
      const template = ONBOARDING_TEMPLATES.find(t => t.id === selectedTemplate);
      const themeOptions = template ? { themeId: template.id, custom: template.config } : undefined;
      const updateData: any = { user_type: selectedType };
      if (themeOptions) updateData.theme_options = themeOptions;
      if (profileName.trim()) updateData.full_name = profileName.trim();
      if (profileBio.trim()) updateData.bio = profileBio.trim();
      if (avatarUrl) updateData.avatar_url = avatarUrl;

      const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);
      if (error) throw error;
      onComplete(selectedType);
      toast({ title: 'Bem-vindo!', description: 'Você pode adicionar seus links depois.' });
    } catch {
      toast({ title: 'Erro', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const totalSteps = 4;

  return (
    <Dialog open={open}>
      <DialogContent
        className={cn(
          '[&>button]:hidden',
          step === 3 ? 'sm:max-w-3xl max-h-[85vh] overflow-y-auto' : 'sm:max-w-lg'
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={cn('h-1.5 w-8 rounded-full transition-colors', step >= i + 1 ? 'bg-primary' : 'bg-muted')} />
            ))}
          </div>

          {step === 1 && (
            <>
              <DialogTitle className="text-xl">Como você pretende usar o LinkHub?</DialogTitle>
              <DialogDescription>Isso nos ajuda a personalizar sua experiência.</DialogDescription>
            </>
          )}
          {step === 2 && (
            <>
              <DialogTitle className="text-xl">Adicionar detalhes do perfil</DialogTitle>
              <DialogDescription>Selecione uma imagem de perfil e adicione título e biografia.</DialogDescription>
            </>
          )}
          {step === 3 && (
            <>
              <DialogTitle className="text-xl">Selecione um modelo</DialogTitle>
              <DialogDescription>Escolha o estilo que lhe parece adequado — você pode alterar depois.</DialogDescription>
            </>
          )}
          {step === 4 && (
            <>
              <DialogTitle className="text-xl">Em quais plataformas você está?</DialogTitle>
              <DialogDescription>Selecione para começar. Você pode atualizar a qualquer momento.</DialogDescription>
            </>
          )}
        </DialogHeader>

        {/* Step 1: User Type */}
        {step === 1 && (
          <div className="space-y-3 mt-4">
            {USER_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
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
        )}

        {/* Step 2: Profile Details */}
        {step === 2 && (
          <div className="mt-4 space-y-6">
            {/* Avatar Selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground text-center">Selecione uma imagem de perfil</p>
              <div className="flex items-center justify-center gap-3">
                {DEFAULT_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => selectDefaultAvatar(url)}
                    className={cn(
                      'rounded-full overflow-hidden transition-all duration-200',
                      'w-16 h-16 hover:scale-110',
                      avatarPreview === url
                        ? 'ring-3 ring-primary ring-offset-2 ring-offset-background scale-110'
                        : 'ring-1 ring-border/30 hover:ring-primary/50'
                    )}
                  >
                    <Avatar className="w-full h-full">
                      <AvatarImage src={url} alt={`Avatar ${i + 1}`} />
                      <AvatarFallback>{i + 1}</AvatarFallback>
                    </Avatar>
                  </button>
                ))}

                {/* Custom upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center transition-all',
                    'hover:scale-110 hover:border-primary',
                    avatarFile
                      ? 'ring-3 ring-primary ring-offset-2 ring-offset-background scale-110 border-primary'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {avatarFile && avatarPreview ? (
                    <Avatar className="w-full h-full">
                      <AvatarImage src={avatarPreview} alt="Custom avatar" />
                      <AvatarFallback><Plus className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                  ) : (
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
              </div>
            </div>

            {/* Name & Bio */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Adicionar título e biografia</p>
              <Input
                placeholder="Título do perfil"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="text-sm"
              />
              <Textarea
                placeholder="Escreva uma breve biografia..."
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                className="text-sm resize-none"
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground text-right">{profileBio.length}/160</p>
            </div>
          </div>
        )}

        {/* Step 3: Template Selection */}
        {step === 3 && (
          <div className="mt-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 justify-items-center">
              {ONBOARDING_TEMPLATES.map((template) => (
                <PhoneMockup
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate === template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Platform Selection */}
        {step === 4 && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const isSelected = selectedPlatforms.has(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                      'hover:shadow-md hover:scale-[1.02]',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border bg-card hover:border-primary/40'
                    )}
                  >
                    <div className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br',
                      isSelected ? platform.color : 'from-muted to-muted'
                    )}>
                      <Icon className={cn('h-5 w-5', isSelected ? 'text-white' : 'text-muted-foreground')} />
                    </div>
                    <span className="text-xs font-medium text-foreground">{platform.label}</span>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* URL inputs for selected platforms */}
            {selectedPlatforms.size > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">Cole os links das plataformas selecionadas (opcional):</p>
                {Array.from(selectedPlatforms).map((platformId) => {
                  const platform = PLATFORMS.find(p => p.id === platformId)!;
                  const Icon = platform.icon;
                  return (
                    <div key={platformId} className="flex items-center gap-2">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br', platform.color)}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <Input
                        placeholder={platform.placeholder}
                        value={platformUrls[platformId] || ''}
                        onChange={(e) => setPlatformUrls(prev => ({ ...prev, [platformId]: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {step > 1 && (
            <Button variant="ghost" size="lg" onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}

          {(step === 2 || step === 3 || step === 4) && (
            <Button variant="ghost" size="lg" onClick={handleSkip} disabled={saving} className="ml-auto">
              Pular
            </Button>
          )}

          {step < 4 ? (
            <Button
              className={cn(step === 1 ? 'w-full' : '')}
              size="lg"
              disabled={(step === 1 && !selectedType) || (step === 3 && !selectedTemplate)}
              onClick={handleNext}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="lg"
              disabled={saving}
              onClick={handleFinish}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {selectedPlatforms.size > 0 ? 'Finalizar' : 'Começar sem links'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const USER_TYPE_LABELS: Record<string, string> = {
  creator: 'Criador',
  business: 'Negócios',
  personal: 'Pessoal',
};
