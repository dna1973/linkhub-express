import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, Upload, ExternalLink, Trash2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || '',
    custom_domain: profile?.custom_domain || '',
    preferred_domain: profile?.preferred_domain || 'lovable',
  });

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username || null,
          full_name: formData.full_name || null,
          bio: formData.bio || null,
          avatar_url: formData.avatar_url || null,
          custom_domain: formData.custom_domain || null,
          preferred_domain: formData.preferred_domain,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
      
      onProfileUpdate();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);

    try {
      // Delete old avatar if exists
      if (formData.avatar_url && formData.avatar_url.includes('supabase')) {
        const oldFileName = formData.avatar_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldFileName}`]);
        }
      }

      // Upload new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));

      toast({
        title: "Sucesso!",
        description: "Imagem carregada com sucesso.",
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a imagem.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

      {/* Profile Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Configurações do Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="space-y-4">
            <Label>Foto de Perfil</Label>
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
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
          <div>
            <Label htmlFor="username">Username (slug único)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                @
              </span>
              <Input
                id="username"
                placeholder="seuusername"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Apenas letras minúsculas, números e underscore
            </p>
          </div>

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
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className="mt-1 resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.bio.length}/160 caracteres
            </p>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full btn-gradient-primary"
          >
            {isLoading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};