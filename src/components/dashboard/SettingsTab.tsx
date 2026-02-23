import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { UsernameInput } from '@/components/ui/username-input';
import { Copy, Check, Upload, ExternalLink, Trash2, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUsernameValidation } from '@/hooks/useUsernameValidation';
import { useAutosave } from '@/hooks/useAutosave';
import { AuthProviderInfo } from './AuthProviderInfo';
import { ImageCropDialog } from './ImageCropDialog';

interface SettingsTabProps {
  profile: any;
  onProfileUpdate: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  profile, 
  onProfileUpdate 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || '',
    custom_domain: profile?.custom_domain || '',
    preferred_domain: profile?.preferred_domain || 'lovable',
    show_username: profile?.show_username ?? true,
  });

  // Username validation
  const usernameValidation = useUsernameValidation(formData.username);

  // Atualizar formData quando profile muda
  React.useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        custom_domain: profile.custom_domain || '',
        preferred_domain: profile.preferred_domain || 'lovable',
        show_username: profile.show_username ?? true,
      });
    }
  }, [profile]);

  // Determinar o domínio baseado na preferência do usuário
  const getSelectedDomain = () => {
    if (formData.preferred_domain === 'custom' && formData.custom_domain) {
      const domain = formData.custom_domain.startsWith('http') 
        ? formData.custom_domain 
        : `https://${formData.custom_domain}`;
      return domain;
    }
    return 'https://linkhub-express.lovable.app';
  };
  
  const publicUrl = profile?.username 
    ? `${getSelectedDomain()}/${profile.username}`
    : 'Configure seu @username primeiro';

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canAutosave = useMemo(() => {
    if (!user) return false;
    if (formData.username && (!usernameValidation.isValid || !usernameValidation.isAvailable)) return false;
    return true;
  }, [user, formData.username, usernameValidation.isValid, usernameValidation.isAvailable]);

  const handleAutosave = useCallback(async (data: typeof formData) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({
        username: data.username || null,
        full_name: data.full_name || null,
        bio: data.bio || null,
        avatar_url: data.avatar_url || null,
        custom_domain: data.custom_domain || null,
        preferred_domain: data.preferred_domain,
        show_username: data.show_username,
      })
      .eq('id', user.id);

    if (error) {
      if (error.code === '23505' && error.message.includes('username')) {
        toast({
          title: "Username já existe",
          description: "Este username já está sendo usado por outro usuário.",
          variant: "destructive",
        });
      }
      throw error;
    }
    
    onProfileUpdate();
  }, [user, toast, onProfileUpdate]);

  const autosaveStatus = useAutosave(formData, handleAutosave, 1500, canAutosave);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Erro", description: "Por favor, selecione apenas arquivos de imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "O arquivo deve ter no máximo 5MB.", variant: "destructive" });
      return;
    }

    setPendingFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropImageSrc(null);
    setPendingFile(null);
    if (!user) return;

    setIsUploadingImage(true);
    try {
      // Delete old avatar if exists
      if (formData.avatar_url && formData.avatar_url.includes('supabase')) {
        const oldFileName = formData.avatar_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('avatars').remove([`${user.id}/${oldFileName}`]);
        }
      }

      const fileName = `${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;
      const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = data.publicUrl;

      // Save directly to database (don't rely on autosave delay)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, avatar_url: newAvatarUrl }));
      onProfileUpdate();
      toast({ title: "Sucesso!", description: "Imagem carregada com sucesso." });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: "Erro", description: "Não foi possível carregar a imagem.", variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!user || !formData.avatar_url) return;

    try {
      // Delete from storage if it's a supabase URL
      if (formData.avatar_url.includes('supabase')) {
        const fileName = formData.avatar_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${fileName}`]);
        }
      }

      setFormData(prev => ({ ...prev, avatar_url: '' }));

      toast({
        title: "Imagem removida",
        description: "A imagem foi removida com sucesso.",
      });

    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a imagem.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async () => {
    if (!profile?.username) return;
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      setIsCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência.",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Configurações do Perfil</CardTitle>
            <AuthProviderInfo />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="space-y-4">
            <Label>Foto de Perfil</Label>
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
              <Avatar className="w-16 h-16 flex-shrink-0">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback className="bg-gradient-primary text-white text-xl">
                  {formData.full_name?.[0]?.toUpperCase() || 
                   user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>{isUploadingImage ? 'Carregando...' : 'Upload'}</span>
                  </Button>
                  {formData.avatar_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteImage}
                      className="flex items-center space-x-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Remover</span>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG ou GIF. Máximo 5MB.
                </p>
              </div>
            </div>
            
            {/* URL Input as alternative */}
            <div>
              <Label htmlFor="avatar_url">Ou cole uma URL da imagem</Label>
              <Input
                id="avatar_url"
                placeholder="https://exemplo.com/sua-foto.jpg"
                value={formData.avatar_url}
                onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Username */}
          <UsernameInput
            value={formData.username}
            onChange={(value) => handleInputChange('username', value)}
            label="Username (slug único)"
            placeholder="seuusername"
          />

          {/* Full Name */}
          <div>
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              placeholder="Seu nome completo"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Biografia</Label>
            <Textarea
              id="bio"
              placeholder="Conte um pouco sobre você..."
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value.slice(0, 160))}
              className="mt-1 resize-none"
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.bio.length}/160 caracteres
            </p>
          </div>

          {/* Show Username Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Exibir @username no perfil público</Label>
              <p className="text-xs text-muted-foreground">
                Quando desativado, o @username não aparecerá na sua página pública.
              </p>
            </div>
            <Switch
              checked={formData.show_username}
              onCheckedChange={(checked) => handleInputChange('show_username', checked as any)}
            />
          </div>

          {/* Autosave Status */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
            {autosaveStatus === 'saving' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Salvando automaticamente...</span>
              </>
            )}
            {autosaveStatus === 'saved' && (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Salvo automaticamente</span>
              </>
            )}
            {autosaveStatus === 'error' && (
              <span className="text-destructive">Erro ao salvar. Tente novamente.</span>
            )}
            {autosaveStatus === 'idle' && (
              <span className="text-muted-foreground/50">As alterações são salvas automaticamente</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Public Link Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ExternalLink className="h-5 w-5" />
            <span>Link Público</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Domain Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom_domain">Domínio Personalizado (opcional)</Label>
              <Input
                id="custom_domain"
                placeholder="meusite.com"
                value={formData.custom_domain}
                onChange={(e) => handleInputChange('custom_domain', e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Adicione seu domínio personalizado (ex: meusite.com)
              </p>
            </div>

            <div>
              <Label htmlFor="preferred_domain">Domínio Preferido</Label>
              <Select
                value={formData.preferred_domain}
                onValueChange={(value) => handleInputChange('preferred_domain', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lovable">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span>Lovable (linkhub-express.lovable.app)</span>
                    </div>
                  </SelectItem>
                  {formData.custom_domain && (
                    <SelectItem value="custom">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span>Personalizado ({formData.custom_domain})</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Seu link para compartilhar</Label>
            <div className="flex mt-2">
              <Input
                value={publicUrl}
                readOnly
                className="rounded-r-none"
                disabled={!profile?.username}
              />
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="rounded-l-none px-3"
                disabled={!profile?.username}
              >
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {profile?.username && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => window.open(publicUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visualizar página pública
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Crop Dialog */}
      {cropImageSrc && (
        <ImageCropDialog
          open={!!cropImageSrc}
          imageSrc={cropImageSrc}
          onClose={() => { setCropImageSrc(null); setPendingFile(null); }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};