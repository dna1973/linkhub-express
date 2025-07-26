import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Github, Mail } from 'lucide-react';
import { GoogleIcon } from '@/components/ui/google-icon';
import { useAuth } from '@/contexts/AuthContext';

export const AuthProviderInfo = () => {
  const { user } = useAuth();

  if (!user) return null;

  const getProviderInfo = () => {
    const providers = user.app_metadata?.providers || [];
    
    if (providers.includes('google')) {
      return {
        icon: <GoogleIcon className="w-4 h-4" />,
        name: 'Google',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      };
    }
    
    if (providers.includes('github')) {
      return {
        icon: <Github className="w-4 h-4" />,
        name: 'GitHub',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      };
    }
    
    return {
      icon: <Mail className="w-4 h-4" />,
      name: 'Email',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    };
  };

  const providerInfo = getProviderInfo();

  return (
    <Badge variant="secondary" className={`${providerInfo.color} flex items-center gap-1`}>
      {providerInfo.icon}
      <span className="text-xs">Conectado via {providerInfo.name}</span>
    </Badge>
  );
};