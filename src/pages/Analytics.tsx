import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentProfile } from '@/contexts/CurrentProfileContext';
import { profileLabel } from '@/lib/profileLabel';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Eye, 
  MousePointer, 
  Calendar,
  TrendingUp,
  Users,
  Globe,
  Smartphone,
  Monitor,
  MapPin
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import WorldHeatmap from '@/components/analytics/WorldHeatmap';
import { SimpleWorldMap } from '@/components/analytics/SimpleWorldMap';
import { MetricCard } from '@/components/analytics/MetricCard';
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap';
import { InsightsPanel, useAnalyticsInsights } from '@/components/analytics/InsightsPanel';

const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Estatísticas do perfil atual (o seletor da sidebar troca)
  const { currentProfile, loading: profileLoading, error: profileError } = useCurrentProfile();
  const profileId = currentProfile?.id ?? null;
  const currentLabel = currentProfile ? profileLabel(currentProfile) : '';
  // Só a carga mais recente mexe na tela: trocar de perfil ou de período descarta a anterior
  const requestRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [profileViews, setProfileViews] = useState([]);
  const [linkClicks, setLinkClicks] = useState([]);
  const [totalViews, setTotalViews] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [topLinks, setTopLinks] = useState([]);
  const [deviceData, setDeviceData] = useState([]);
  const [countryData, setCountryData] = useState([]);
  const [activityHeatmapData, setActivityHeatmapData] = useState([]);
  const [previousPeriodData, setPreviousPeriodData] = useState({
    views: 0,
    clicks: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!profileId) return;
    loadAnalytics(profileId);
  }, [user, navigate, timeRange, profileId]);

  const getDateRange = () => {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days - 1));
    return { startDate, endDate };
  };

  const loadAnalytics = async (id: string) => {
    const request = ++requestRef.current;
    setLoading(true);

    const { startDate, endDate } = getDateRange();
    
    // Calculate previous period for comparison
    const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousEndDate = startOfDay(subDays(startDate, 1));
    const previousStartDate = startOfDay(subDays(previousEndDate, periodLength - 1));

    try {
      // Buscar visualizações do perfil (período atual)
      const { data: views } = await supabase
        .from('profile_views')
        .select('*')
        .eq('profile_id', id)
        .gte('viewed_at', startDate.toISOString())
        .lte('viewed_at', endDate.toISOString())
        .order('viewed_at', { ascending: true });

      // Buscar visualizações do período anterior para comparação
      const { data: previousViews } = await supabase
        .from('profile_views')
        .select('*')
        .eq('profile_id', id)
        .gte('viewed_at', previousStartDate.toISOString())
        .lte('viewed_at', previousEndDate.toISOString());

      // Buscar links do usuário para obter total de cliques
      const { data: userLinks } = await supabase
        .from('links')
        .select('id, title, clicks')
        .eq('user_id', id);

      // Buscar cliques nos links para análise temporal (período atual)
      const { data: clicks, error: clicksError } = await supabase
        .from('link_clicks')
        .select(`
          id,
          link_id,
          profile_id,
          clicked_at,
          country,
          city,
          user_agent,
          referrer,
          links(title, url)
        `)
        .eq('profile_id', id)
        .gte('clicked_at', startDate.toISOString())
        .lte('clicked_at', endDate.toISOString())
        .order('clicked_at', { ascending: true });

      // Buscar cliques do período anterior
      const { data: previousClicks } = await supabase
        .from('link_clicks')
        .select('id')
        .eq('profile_id', id)
        .gte('clicked_at', previousStartDate.toISOString())
        .lte('clicked_at', previousEndDate.toISOString());

      if (clicksError) {
        console.error('❌ Erro ao buscar cliques:', clicksError);
      }

      // Outra carga começou (troca de perfil ou de período): esta não mexe mais na tela
      if (request !== requestRef.current) return;

      // Calcular total de cliques somando os cliques de cada link
      const totalClicksSum = userLinks?.reduce((sum, link) => sum + (link.clicks || 0), 0) || 0;

      console.log('📊 Analytics - Views encontradas:', views?.length);
      console.log('📊 Analytics - Links encontrados:', userLinks?.length);
      console.log('📊 Analytics - Total de cliques (soma):', totalClicksSum);
      console.log('📊 Analytics - Cliques no período:', clicks?.length);

      setTotalViews(views?.length || 0);
      setTotalClicks(totalClicksSum);

      // Set previous period data for comparison
      setPreviousPeriodData({
        views: previousViews?.length || 0,
        clicks: previousClicks?.length || 0
      });

      // Processar dados para gráficos
      const chartData = processChartData(views || [], clicks || []);
      setProfileViews(chartData);
      processTopLinks(userLinks || []);
      processDeviceData(views || [], clicks || []);
      processCountryData(views || [], clicks || []);
      processActivityHeatmap(views || [], clicks || []);

    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  };

  const processChartData = (views, clicks) => {
    const { startDate, endDate } = getDateRange();
    const days = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    const chartData = days.map(day => {
      const dayViews = views.filter(v => 
        format(new Date(v.viewed_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      ).length;
      
      const dayClicks = clicks.filter(c => 
        format(new Date(c.clicked_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      ).length;

      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        views: dayViews,
        clicks: dayClicks
      };
    });

    return chartData;
  };

  const processTopLinks = (userLinks: any[]) => {
    console.log('🔍 Processing top links from userLinks:', userLinks);
    
    const sorted = userLinks
      .filter(link => link.clicks > 0)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5)
      .map(link => ({
        title: link.title,
        clicks: link.clicks
      }));

    console.log('📈 Top links processados:', sorted);
    setTopLinks(sorted);
  };

  const processDeviceData = (views: any[], clicks: any[]) => {
    const deviceStats: Record<string, number> = {};
    
    [...views, ...clicks].forEach(item => {
      const userAgent = item.user_agent || '';
      let device = 'Desktop';
      
      if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
        device = 'Mobile';
      } else if (/Tablet|iPad/.test(userAgent)) {
        device = 'Tablet';
      }
      
      deviceStats[device] = (deviceStats[device] || 0) + 1;
    });

    const deviceArray = Object.entries(deviceStats).map(([name, value]) => ({
      name,
      value,
      fill: name === 'Mobile' ? '#3b82f6' : name === 'Tablet' ? '#8b5cf6' : '#10b981'
    }));

    setDeviceData(deviceArray);
  };

  // Função para normalizar e consolidar países
  const normalizeCountryData = (items: any[]) => {
    const countryMap = new Map<string, { name: string; value: number; code?: string }>();
    
    items.forEach((item, index) => {
      const countryCode = item.country_code;
      const countryName = item.country;
      
      if (!countryCode && (!countryName || countryName === 'null')) {
        return;
      }
      
      // Estratégia de consolidação:
      // 1. Se tem código, usar código como chave
      // 2. Se não tem código, normalizar nome
      let key: string;
      let displayName: string;
      let code: string | undefined;
      
      if (countryCode) {
        key = countryCode.toUpperCase();
        displayName = countryName || countryCode;
        code = countryCode.toUpperCase();
      } else {
        // Normalizar nomes comuns
        const normalizedName = countryName.toLowerCase();
        if (normalizedName === 'brazil' || normalizedName === 'brasil') {
          key = 'BR';
          displayName = 'Brazil';
          code = 'BR';
        } else if (normalizedName === 'united states' || normalizedName === 'usa') {
          key = 'US';
          displayName = 'United States';
          code = 'US';
        } else {
          key = countryName;
          displayName = countryName;
          code = undefined;
        }
      }
      
      if (countryMap.has(key)) {
        const existing = countryMap.get(key)!;
        existing.value++;
        // Atualizar nome se o atual for melhor (mais completo)
        if (countryName && countryName.length > existing.name.length) {
          existing.name = countryName;
        }
      } else {
        countryMap.set(key, {
          name: displayName,
          value: 1,
          code: code
        });
      }
      
      console.log('📍 País processado:', { key, displayName, code, total: countryMap.get(key)!.value });
    });
    
    return Array.from(countryMap.values());
  };

  const processCountryData = (views: any[], clicks: any[]) => {
    console.log('🌍 Processing country data:', { 
      viewsCount: views.length, 
      clicksCount: clicks.length,
      sampleView: views[0],
      sampleClick: clicks[0]
    });
    
    // Consolidar dados de ambas as fontes
    const allItems = [...views, ...clicks];
    const normalizedCountries = normalizeCountryData(allItems);
    
    const sorted = normalizedCountries
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    console.log('🌍 Countries consolidados final:', sorted);
    console.log('🗺️ Enviando para WorldHeatmap:', { 
      dataLength: sorted.length, 
      maxValue: sorted.length > 0 ? Math.max(...sorted.map(d => d.value)) : 0 
    });
    
    setCountryData(sorted);
  };

  const processActivityHeatmap = (views: any[], clicks: any[]) => {
    const activityMap: Record<string, number> = {};
    
    [...views, ...clicks].forEach(item => {
      const date = new Date(item.viewed_at || item.clicked_at);
      const hour = date.getHours();
      const day = date.getDay();
      const key = `${day}-${hour}`;
      
      activityMap[key] = (activityMap[key] || 0) + 1;
    });

    const heatmapData = Object.entries(activityMap).map(([key, count]) => {
      const [day, hour] = key.split('-').map(Number);
      return {
        day,
        hour,
        count
      };
    });

    setActivityHeatmapData(heatmapData);
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  // Calculate percentage changes
  const viewsChange = previousPeriodData.views > 0 
    ? ((totalViews - previousPeriodData.views) / previousPeriodData.views) * 100 
    : totalViews > 0 ? 100 : 0;
    
  const clicksChange = previousPeriodData.clicks > 0 
    ? ((totalClicks - previousPeriodData.clicks) / previousPeriodData.clicks) * 100 
    : totalClicks > 0 ? 100 : 0;

  const conversionRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
  const previousConversionRate = previousPeriodData.views > 0 
    ? (previousPeriodData.clicks / previousPeriodData.views) * 100 
    : 0;
  const conversionChange = previousConversionRate > 0 
    ? ((conversionRate - previousConversionRate) / previousConversionRate) * 100 
    : conversionRate > 0 ? 100 : 0;

  // Generate insights
  const analyticsData = {
    totalViews,
    totalClicks,
    topLinks,
    deviceData,
    timeRange,
    conversionRate
  };
  const insights = useAnalyticsInsights(analyticsData);

  if (!profileLoading && !currentProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <p className="text-muted-foreground">{profileError || 'Não foi possível carregar o seu perfil.'}</p>
      </div>
    );
  }

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            {currentLabel ? `Acompanhe o desempenho de ${currentLabel}` : 'Acompanhe o desempenho do seu perfil'}
          </p>
        </div>
        
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Últimas 24h</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Total de Visualizações"
          value={totalViews}
          previousValue={previousPeriodData.views}
          change={viewsChange}
          changeType={viewsChange > 0 ? 'increase' : viewsChange < 0 ? 'decrease' : 'neutral'}
          icon={Eye}
          description="Visualizações no período selecionado"
          gradient="from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
        />

        <MetricCard
          title="Total de Cliques"
          value={totalClicks}
          previousValue={previousPeriodData.clicks}
          change={clicksChange}
          changeType={clicksChange > 0 ? 'increase' : clicksChange < 0 ? 'decrease' : 'neutral'}
          icon={MousePointer}
          description="Cliques no período selecionado"
          gradient="from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900"
        />

        <MetricCard
          title="Taxa de Conversão"
          value={conversionRate}
          previousValue={previousConversionRate}
          change={conversionChange}
          changeType={conversionChange > 0 ? 'increase' : conversionChange < 0 ? 'decrease' : 'neutral'}
          icon={TrendingUp}
          description="Percentual de cliques por visualização"
          format="percentage"
          gradient="from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
        />

        <MetricCard
          title="Visitantes Únicos"
          value={Math.floor(totalViews * 0.85)}
          previousValue={Math.floor(previousPeriodData.views * 0.85)}
          change={viewsChange} // Same as views change since it's estimated
          changeType={viewsChange > 0 ? 'increase' : viewsChange < 0 ? 'decrease' : 'neutral'}
          icon={Users}
          description="Estimativa de visitantes únicos"
          gradient="from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900"
        />
      </div>

      {/* Insights Panel */}
      <InsightsPanel insights={insights} loading={loading} />

      {/* Activity Heatmap */}
      <ActivityHeatmap 
        data={activityHeatmapData} 
        title="Padrão de Atividade por Hora e Dia"
      />

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Traffic Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="h-5 w-5 mr-2" />
              Tráfego ao Longo do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={profileViews}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stackId="1"
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6}
                  name="Visualizações"
                />
                <Area 
                  type="monotone" 
                  dataKey="clicks" 
                  stackId="2"
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.6}
                  name="Cliques"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Monitor className="h-5 w-5 mr-2" />
              Distribuição por Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Links and Countries */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Top Links */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <MousePointer className="h-5 w-5 mr-2" />
              Links Mais Clicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topLinks.map((link, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">{index + 1}</span>
                    </div>
                    <span className="font-medium truncate">{link.title}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{link.clicks} cliques</span>
                </div>
              ))}
              {topLinks.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum clique registrado ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* World Heatmap */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Globe className="h-5 w-5 mr-2" />
              Mapa de Calor Mundial - Acessos por País
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[32rem]">
              {/* Usar mapa real quando tiver dados consolidados */}
              {countryData.length > 0 ? (
                <WorldHeatmap 
                  data={countryData} 
                  maxValue={Math.max(...countryData.map(d => d.value))}
                />
              ) : (
                <SimpleWorldMap 
                  data={countryData} 
                  maxValue={0}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;