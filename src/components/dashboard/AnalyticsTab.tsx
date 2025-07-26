import React from 'react';
import Analytics from '@/pages/Analytics';

interface AnalyticsTabProps {
  profile: any;
  onProfileUpdate: () => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ profile, onProfileUpdate }) => {
  return <Analytics />;
};