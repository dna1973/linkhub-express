import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Globe, Smartphone, Monitor, Tablet, Clock, MapPin } from 'lucide-react';

interface LinkClick {
  id: number;
  clicked_at: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  device_type: string | null;
  user_agent: string | null;
  referrer: string | null;
}

interface LinkClicksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkId: number;
  linkTitle: string;
  profileId: string;
}

const DeviceIcon = ({ type }: { type: string | null }) => {
  const t = (type || '').toLowerCase();
  if (t.includes('mobile')) return <Smartphone className="h-4 w-4 text-blue-400" />;
  if (t.includes('tablet')) return <Tablet className="h-4 w-4 text-purple-400" />;
  return <Monitor className="h-4 w-4 text-emerald-400" />;
};

const getBrowserFromUA = (ua: string | null): string => {
  if (!ua) return 'Desconhecido';
  const lower = ua.toLowerCase();
  if (lower.includes('chrome') && !lower.includes('edg')) return 'Chrome';
  if (lower.includes('firefox')) return 'Firefox';
  if (lower.includes('safari') && !lower.includes('chrome')) return 'Safari';
  if (lower.includes('edg')) return 'Edge';
  if (lower.includes('opera') || lower.includes('opr')) return 'Opera';
  return 'Outro';
};

export const LinkClicksDialog: React.FC<LinkClicksDialogProps> = ({
  open,
  onOpenChange,
  linkId,
  linkTitle,
  profileId,
}) => {
  const [clicks, setClicks] = useState<LinkClick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadClicks();
    }
  }, [open, linkId]);

  const loadClicks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('link_clicks')
      .select('id, clicked_at, country, country_code, city, device_type, user_agent, referrer')
      .eq('link_id', linkId)
      .eq('profile_id', profileId)
      .order('clicked_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setClicks(data);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-sm border-border/50 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Cliques em "{linkTitle}"
            <Badge variant="secondary" className="text-xs">{clicks.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="space-y-3 p-1">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : clicks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum clique registrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {clicks.map((click) => (
                <div
                  key={click.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
                >
                  <DeviceIcon type={click.device_type} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {[click.city, click.country].filter(Boolean).join(', ') || 'Local desconhecido'}
                      </span>
                      {click.country_code && (
                        <span className="text-xs text-muted-foreground">({click.country_code})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(click.clicked_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <span>{getBrowserFromUA(click.user_agent)}</span>
                      <span className="capitalize">{click.device_type || 'desktop'}</span>
                    </div>
                    {click.referrer && (
                      <p className="text-xs text-muted-foreground/70 truncate">
                        Ref: {click.referrer}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
