import React from 'react';
import { DesignEditor } from '@/components/design-system';

interface DesignSystemTabProps {
  profile: any;
  onProfileUpdate: () => void;
}

export const DesignSystemTab: React.FC<DesignSystemTabProps> = ({ 
  profile, 
  onProfileUpdate 
}) => {
  return (
    <div className="h-[calc(100vh-8rem)] w-full">
      <DesignEditor 
        profileId={profile?.id || ''} 
        className="h-full"
      />
    </div>
  );
};