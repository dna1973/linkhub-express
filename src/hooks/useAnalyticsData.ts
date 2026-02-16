import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalyticsData {
  totalViews: number;
  totalClicks: number;
  uniqueVisitors: number;
  conversionRate: number;
  topLinks: Array<{ title: string; clicks: number; url: string }>;
  deviceData: Array<{ name: string; value: number; fill: string }>;
  countryData: Array<{ name: string; value: number; code?: string }>;
  timeSeriesData: Array<{ date: string; views: number; clicks: number }>;
  activityHeatmap: Array<{ hour: number; day: number; count: number }>;
  previousPeriodData: {
    views: number;
    clicks: number;
    uniqueVisitors: number;
  };
}

export const useAnalyticsData = (userId: string, timeRange: string) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDateRange = useCallback(() => {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days - 1));
    return { startDate, endDate };
  }, [timeRange]);

  const loadAnalyticsData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange();
      
      // Calculate previous period
      const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const previousEndDate = startOfDay(subDays(startDate, 1));
      const previousStartDate = startOfDay(subDays(previousEndDate, periodLength - 1));

      // Consulta otimizada para visualizações com dados de país
      const { data: views, error: viewsError } = await supabase
        .from('profile_views')
        .select(`
          id,
          viewed_at,
          country,
          country_code,
          city,
          user_agent,
          device_type,
          session_id
        `)
        .eq('profile_id', userId)
        .gte('viewed_at', startDate.toISOString())
        .lte('viewed_at', endDate.toISOString())
        .order('viewed_at', { ascending: true });

      if (viewsError) throw viewsError;

      // Consulta otimizada para cliques com JOIN para obter dados dos links
      const { data: clicks, error: clicksError } = await supabase
        .from('link_clicks')
        .select(`
          id,
          clicked_at,
          country,
          country_code,
          city,
          user_agent,
          device_type,
          session_id,
          links!inner(
            id,
            title,
            url
          )
        `)
        .eq('profile_id', userId)
        .gte('clicked_at', startDate.toISOString())
        .lte('clicked_at', endDate.toISOString())
        .order('clicked_at', { ascending: true });

      if (clicksError) throw clicksError;

      // Dados do período anterior para comparação
      const { data: previousViews } = await supabase
        .from('profile_views')
        .select('id, session_id')
        .eq('profile_id', userId)
        .gte('viewed_at', previousStartDate.toISOString())
        .lte('viewed_at', previousEndDate.toISOString());

      const { data: previousClicks } = await supabase
        .from('link_clicks')
        .select('id')
        .eq('profile_id', userId)
        .gte('clicked_at', previousStartDate.toISOString())
        .lte('clicked_at', previousEndDate.toISOString());

      // Processar dados
      const processedData = processAnalyticsData(
        views || [],
        clicks || [],
        previousViews || [],
        previousClicks || [],
        { startDate, endDate }
      );

      setData(processedData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Erro ao carregar dados de analytics');
    } finally {
      setLoading(false);
    }
  }, [userId, getDateRange]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  return { data, loading, error, refetch: loadAnalyticsData };
};

// Função para processar os dados de analytics
const processAnalyticsData = (
  views: any[],
  clicks: any[],
  previousViews: any[],
  previousClicks: any[],
  dateRange: { startDate: Date; endDate: Date }
): AnalyticsData => {
  // Métricas básicas
  const totalViews = views.length;
  const totalClicks = clicks.length;
  const uniqueVisitors = new Set(views.map(v => v.session_id).filter(Boolean)).size;
  const conversionRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

  // Dados do período anterior
  const previousPeriodData = {
    views: previousViews.length,
    clicks: previousClicks.length,
    uniqueVisitors: new Set(previousViews.map(v => v.session_id).filter(Boolean)).size
  };

  // Processar top links
  const linkStats: Record<string, { title: string; clicks: number; url: string }> = {};
  clicks.forEach(click => {
    if (click.links) {
      const linkId = click.links.id;
      if (!linkStats[linkId]) {
        linkStats[linkId] = {
          title: click.links.title,
          url: click.links.url,
          clicks: 0
        };
      }
      linkStats[linkId].clicks++;
    }
  });

  const topLinks = Object.values(linkStats)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  // Processar dados de dispositivos
  const deviceStats: Record<string, number> = {};
  [...views, ...clicks].forEach(item => {
    const deviceType = item.device_type || getDeviceTypeFromUserAgent(item.user_agent || '');
    deviceStats[deviceType] = (deviceStats[deviceType] || 0) + 1;
  });

  const deviceData = Object.entries(deviceStats).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: getDeviceColor(name)
  }));

  // Processar dados de países (usando country_code quando disponível)
  const countryStats: Record<string, { name: string; value: number; code?: string }> = {};
  [...views, ...clicks].forEach(item => {
    const countryCode = item.country_code;
    const countryName = item.country;
    
    if (countryCode || countryName) {
      const key = countryCode || countryName;
      if (!countryStats[key]) {
        countryStats[key] = {
          name: countryName || countryCode,
          value: 0,
          code: countryCode
        };
      }
      countryStats[key].value++;
    }
  });

  const countryData = Object.values(countryStats)
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  // Processar dados de série temporal
  const timeSeriesData = processTimeSeriesData(views, clicks, dateRange);

  // Processar heatmap de atividade
  const activityHeatmap = processActivityHeatmap(views, clicks);

  return {
    totalViews,
    totalClicks,
    uniqueVisitors,
    conversionRate,
    topLinks,
    deviceData,
    countryData,
    timeSeriesData,
    activityHeatmap,
    previousPeriodData
  };
};

// Função auxiliar para detectar tipo de dispositivo do user agent
const getDeviceTypeFromUserAgent = (userAgent: string): string => {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return 'tablet';
  if (/mobile|android|iphone/.test(ua)) return 'mobile';
  return 'desktop';
};

// Função auxiliar para cores dos dispositivos
const getDeviceColor = (deviceType: string): string => {
  const colors = {
    mobile: '#3b82f6',
    desktop: '#10b981',
    tablet: '#8b5cf6'
  };
  return colors[deviceType as keyof typeof colors] || '#6b7280';
};

// Função para processar dados de série temporal
const processTimeSeriesData = (
  views: any[],
  clicks: any[],
  { startDate, endDate }: { startDate: Date; endDate: Date }
) => {
  const days = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  return days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    
    const dayViews = views.filter(v => 
      format(new Date(v.viewed_at), 'yyyy-MM-dd') === dayStr
    ).length;
    
    const dayClicks = clicks.filter(c => 
      format(new Date(c.clicked_at), 'yyyy-MM-dd') === dayStr
    ).length;

    return {
      date: format(day, 'dd/MM', { locale: ptBR }),
      views: dayViews,
      clicks: dayClicks
    };
  });
};

// Função para processar heatmap de atividade
const processActivityHeatmap = (views: any[], clicks: any[]) => {
  const activityMap: Record<string, number> = {};
  
  [...views, ...clicks].forEach(item => {
    const date = new Date(item.viewed_at || item.clicked_at);
    const hour = date.getHours();
    const day = date.getDay();
    const key = `${day}-${hour}`;
    
    activityMap[key] = (activityMap[key] || 0) + 1;
  });

  return Object.entries(activityMap).map(([key, count]) => {
    const [day, hour] = key.split('-').map(Number);
    return { day, hour, count };
  });
};