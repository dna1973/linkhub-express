import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [profileViews, setProfileViews] = useState([]);
  const [linkClicks, setLinkClicks] = useState([]);
  const [totalViews, setTotalViews] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [topLinks, setTopLinks] = useState([]);
  const [deviceData, setDeviceData] = useState([]);
  const [countryData, setCountryData] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadAnalytics();
  }, [user, navigate, timeRange]);

  const getDateRange = () => {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days - 1));
    return { startDate, endDate };
  };

  const loadAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    const { startDate, endDate } = getDateRange();

    try {
      // Buscar visualizações do perfil
      const { data: views } = await supabase
        .from('profile_views')
        .select('*')
        .eq('profile_id', user.id)
        .gte('viewed_at', startDate.toISOString())
        .lte('viewed_at', endDate.toISOString())
        .order('viewed_at', { ascending: true });

      // Buscar cliques nos links
      const { data: clicks } = await supabase
        .from('link_clicks')
        .select(`
          *,
          links!inner(title)
        `)
        .eq('profile_id', user.id)
        .gte('clicked_at', startDate.toISOString())
        .lte('clicked_at', endDate.toISOString())
        .order('clicked_at', { ascending: true });

      setProfileViews(views || []);
      setLinkClicks(clicks || []);
      setTotalViews(views?.length || 0);
      setTotalClicks(clicks?.length || 0);

      // Processar dados para gráficos
      processChartData(views || [], clicks || []);
      processTopLinks(clicks || []);
      processDeviceData(views || [], clicks || []);
      processCountryData(views || [], clicks || []);

    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
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

    setProfileViews(chartData);
  };

  const processTopLinks = (clicks: any[]) => {
    const linkStats: Record<string, { title: string; clicks: number }> = {};
    clicks.forEach(click => {
      const linkId = click.link_id;
      const linkTitle = click.links?.title || 'Link sem título';
      
      if (!linkStats[linkId]) {
        linkStats[linkId] = { title: linkTitle, clicks: 0 };
      }
      linkStats[linkId].clicks++;
    });

    const sorted = Object.values(linkStats)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    setTopLinks(sorted as any);
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

  const processCountryData = (views: any[], clicks: any[]) => {
    const countryStats: Record<string, number> = {};
    
    [...views, ...clicks].forEach(item => {
      const country = item.country || 'Desconhecido';
      countryStats[country] = (countryStats[country] || 0) + 1;
    });

    const sorted = Object.entries(countryStats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    setCountryData(sorted);
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
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
          <p className="text-muted-foreground mt-2">Acompanhe o desempenho do seu perfil</p>
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
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Total de Visualizações
            </CardTitle>
            <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{totalViews}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Visualizações no período selecionado
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Total de Cliques
            </CardTitle>
            <MousePointer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">{totalClicks}</div>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              Cliques no período selecionado
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Taxa de Cliques
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800 dark:text-green-200">
              {totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">
              Percentual de cliques por visualização
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Visitantes Únicos
            </CardTitle>
            <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
              {Math.floor(totalViews * 0.85)}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Estimativa de visitantes únicos
            </p>
          </CardContent>
        </Card>
      </div>

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

        {/* Top Countries */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <MapPin className="h-5 w-5 mr-2" />
              Países com Mais Acessos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={countryData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;