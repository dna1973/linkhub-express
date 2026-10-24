import React from 'react';
import { ExternalLink, Instagram, Youtube, Github, Globe, Mail, Facebook, Linkedin } from 'lucide-react';
import googleDriveIcon from '@/assets/google-drive.png';
import notebookLmIcon from '@/assets/notebook-lm.svg';

export type LinkIcon = React.ComponentType<{ className?: string }>;

const GoogleDriveIcon: LinkIcon = ({ className }) => <img src={googleDriveIcon} alt="Google Drive" className={className} />;
const NotebookLmIcon: LinkIcon = ({ className }) => <img src={notebookLmIcon} alt="NotebookLM" className={className} />;

/** Ícone por palavra no título. A ordem importa: vale a primeira chave contida no título. */
export const ICON_MAP: Record<string, LinkIcon> = {
  instagram: Instagram,
  x: ExternalLink,
  tiktok: ExternalLink,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
  googledrive: GoogleDriveIcon,
  'google drive': GoogleDriveIcon,
  drive: GoogleDriveIcon,
  notebooklm: NotebookLmIcon,
  notebook: NotebookLmIcon,
  website: Globe,
  web: Globe,
  email: Mail,
  default: ExternalLink,
};

/** Ícone do link: primeiro pelo título, depois pelo endereço; sites comuns ficam com o globo. */
export function getLinkIcon(title: string, url?: string): LinkIcon {
  const lowerTitle = title.toLowerCase();
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (key !== 'default' && lowerTitle.includes(key)) {
      return Icon;
    }
  }
  if (url) {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('instagram.com')) return ICON_MAP.instagram;
    if (lowerUrl.includes('youtube.com')) return ICON_MAP.youtube;
    if (lowerUrl.includes('github.com')) return ICON_MAP.github;
    if (lowerUrl.includes('facebook.com')) return ICON_MAP.facebook;
    if (lowerUrl.includes('linkedin.com')) return ICON_MAP.linkedin;
    if (lowerUrl.includes('x.com') || lowerUrl.includes('twitter.com')) return ICON_MAP.x;
    if (lowerUrl.includes('tiktok.com')) return ICON_MAP.tiktok;
    if (lowerUrl.includes('drive.google.com')) return ICON_MAP.drive;
    if (lowerUrl.includes('notebooklm.google.com')) return ICON_MAP.notebooklm;
    if (lowerUrl.startsWith('mailto:')) return ICON_MAP.email;
  }
  return Globe;
}
