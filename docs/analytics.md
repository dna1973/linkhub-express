# Painel de Analytics - Especificação Técnica

## Visão Geral

O painel de analytics do LinkHub fornecerá insights detalhados sobre o desempenho dos links, visualizações de perfil e engajamento dos usuários através de dashboards interativos, gráficos em tempo real e relatórios exportáveis.

## 📊 Estrutura do Dashboard

### Layout Principal
```
┌─────────────────────────────────────────────────────┐
│                    Header                           │
├─────────────────────────────────────────────────────┤
│  [Total Cliques] [Visualizações] [Taxa Conv.] [CTR] │
├─────────────────────────────────────────────────────┤
│  Gráfico Temporal        │  Top Links Performance  │
│  (Linha/Área)           │  (Barras Horizontais)   │
├─────────────────────────────────────────────────────┤
│  Dispositivos           │  Localização Geográfica  │
│  (Pizza/Donut)          │  (Mapa/Lista)           │
├─────────────────────────────────────────────────────┤
│              Tabela Detalhada de Links             │
└─────────────────────────────────────────────────────┘
```

## 🎯 Componentes Principais

### 1. Cards de Métricas

#### 1.1. Card de Cliques Totais
```typescript
interface ClicksCardProps {
  totalClicks: number;
  previousPeriod: number;
  changePercentage: number;
  sparklineData: number[];
}

const ClicksCard = ({ totalClicks, previousPeriod, changePercentage, sparklineData }: ClicksCardProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total de Cliques</p>
          <p className="text-3xl font-bold">{totalClicks.toLocaleString()}</p>
          <div className="flex items-center mt-2">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-500">
              +{changePercentage}% vs período anterior
            </span>
          </div>
        </div>
        <div className="w-20 h-12">
          <Sparkline data={sparklineData} />
        </div>
      </div>
    </Card>
  );
};
```

#### 1.2. Card de Visualizações de Perfil
```typescript
const ProfileViewsCard = ({ views, uniqueVisitors, bounceRate }) => {
  return (
    <Card className="p-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Visualizações do Perfil</p>
        <p className="text-3xl font-bold">{views.toLocaleString()}</p>
        <div className="flex justify-between text-sm">
          <span>Visitantes únicos: {uniqueVisitors}</span>
          <span>Taxa de rejeição: {bounceRate}%</span>
        </div>
      </div>
    </Card>
  );
};
```

#### 1.3. Card de Taxa de Conversão
```typescript
const ConversionCard = ({ rate, conversions, improvement }) => {
  return (
    <Card className="p-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
        <p className="text-3xl font-bold">{rate}%</p>
        <div className="flex items-center">
          <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
          <span className="text-sm text-green-500">
            +{improvement}% este mês
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {conversions} conversões totais
        </p>
      </div>
    </Card>
  );
};
```

### 2. Gráficos Interativos

#### 2.1. Gráfico de Linha Temporal
```typescript
const TimeSeriesChart = ({ data, period, onPeriodChange }) => {
  return (
    <Card className="p-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Cliques ao Longo do Tempo</CardTitle>
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
              <SelectItem value="1y">1 ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="clicks" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={{ fill: '#8884d8' }}
            />
            <Line 
              type="monotone" 
              dataKey="views" 
              stroke="#82ca9d" 
              strokeWidth={2}
              dot={{ fill: '#82ca9d' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

#### 2.2. Gráfico de Performance por Link
```typescript
const LinkPerformanceChart = ({ data, sortBy, onSortChange }) => {
  return (
    <Card className="p-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Performance por Link</CardTitle>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clicks">Cliques</SelectItem>
              <SelectItem value="ctr">CTR</SelectItem>
              <SelectItem value="conversions">Conversões</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="title" type="category" width={100} />
            <Tooltip />
            <Bar dataKey="clicks" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

#### 2.3. Gráfico de Dispositivos
```typescript
const DeviceChart = ({ data }) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Dispositivos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Lista de dispositivos */}
        <div className="mt-4 space-y-2">
          {data.map((device, index) => (
            <div key={device.name} className="flex justify-between items-center">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm">{device.name}</span>
              </div>
              <div className="text-right">
                <span className="font-medium">{device.value}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({device.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 3. Heatmap de Atividade

```typescript
const ActivityHeatmap = ({ data }) => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getIntensity = (day: number, hour: number) => {
    const activity = data.find(d => d.day === day && d.hour === hour);
    return activity ? activity.intensity : 0;
  };

  const getColor = (intensity: number) => {
    if (intensity === 0) return 'bg-gray-100';
    if (intensity < 0.25) return 'bg-green-200';
    if (intensity < 0.5) return 'bg-green-300';
    if (intensity < 0.75) return 'bg-green-400';
    return 'bg-green-500';
  };

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Heatmap de Atividade</CardTitle>
        <p className="text-sm text-muted-foreground">
          Padrão de cliques por dia da semana e hora
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header com horas */}
          <div className="flex">
            <div className="w-12"></div>
            {hours.map(hour => (
              <div key={hour} className="w-4 text-xs text-center">
                {hour % 6 === 0 ? hour : ''}
              </div>
            ))}
          </div>
          
          {/* Grid do heatmap */}
          {days.map((day, dayIndex) => (
            <div key={day} className="flex items-center">
              <div className="w-12 text-xs text-right pr-2">{day}</div>
              {hours.map(hour => (
                <div
                  key={`${dayIndex}-${hour}`}
                  className={`w-4 h-4 mr-1 rounded-sm ${getColor(getIntensity(dayIndex, hour))}`}
                  title={`${day} ${hour}:00 - ${getIntensity(dayIndex, hour)} cliques`}
                />
              ))}
            </div>
          ))}
        </div>
        
        {/* Legenda */}
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <span>Menos</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-gray-100 rounded-sm" />
            <div className="w-3 h-3 bg-green-200 rounded-sm" />
            <div className="w-3 h-3 bg-green-300 rounded-sm" />
            <div className="w-3 h-3 bg-green-400 rounded-sm" />
            <div className="w-3 h-3 bg-green-500 rounded-sm" />
          </div>
          <span>Mais</span>
        </div>
      </CardContent>
    </Card>
  );
};
```

### 4. Tabela Detalhada de Links

```typescript
const LinksTable = ({ data, onSort, sortConfig }) => {
  const columns = [
    { key: 'title', label: 'Link', sortable: true },
    { key: 'clicks', label: 'Cliques', sortable: true },
    { key: 'views', label: 'Visualizações', sortable: true },
    { key: 'ctr', label: 'CTR', sortable: true },
    { key: 'conversions', label: 'Conversões', sortable: true },
    { key: 'lastClick', label: 'Último Clique', sortable: true },
  ];

  return (
    <Card className="p-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Detalhes por Link</CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead 
                  key={column.key}
                  className={column.sortable ? 'cursor-pointer hover:bg-muted' : ''}
                  onClick={() => column.sortable && onSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable && (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((link) => (
              <TableRow key={link.id}>
                <TableCell>
                  <div className="flex items-center">
                    <img 
                      src={link.favicon} 
                      alt="" 
                      className="w-4 h-4 mr-2"
                    />
                    <div>
                      <p className="font-medium">{link.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.url}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <span className="font-medium">{link.clicks}</span>
                    <Badge 
                      variant={link.clicksChange > 0 ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {link.clicksChange > 0 ? '+' : ''}{link.clicksChange}%
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{link.views}</TableCell>
                <TableCell>{link.ctr}%</TableCell>
                <TableCell>{link.conversions}</TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(link.lastClick), { 
                      addSuffix: true,
                      locale: ptBR 
                    })}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
```

## 🔄 Sistema de Tracking

### Event Tracking Hook
```typescript
export const useAnalytics = () => {
  const trackEvent = useCallback(async (eventData: AnalyticsEvent) => {
    try {
      // Coletar dados do contexto
      const context = {
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        sessionId: getSessionId(),
        ...eventData
      };

      // Enviar para Supabase
      await supabase.from('analytics_events').insert(context);
      
      // Cache local para offline
      if (!navigator.onLine) {
        storeEventLocally(context);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, []);

  const trackClick = useCallback((linkId: string, linkUrl: string) => {
    trackEvent({
      event_type: 'click',
      link_id: linkId,
      metadata: { url: linkUrl }
    });
  }, [trackEvent]);

  const trackView = useCallback((profileId: string) => {
    trackEvent({
      event_type: 'view',
      profile_id: profileId,
      metadata: { page: 'profile' }
    });
  }, [trackEvent]);

  return { trackClick, trackView, trackEvent };
};
```

### Data Processing
```typescript
// Edge Function para agregação de dados
export const aggregateAnalytics = async (profileId: string, period: string) => {
  const { data: events } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('profile_id', profileId)
    .gte('created_at', getStartDate(period));

  // Processar dados
  const metrics = {
    totalClicks: events.filter(e => e.event_type === 'click').length,
    totalViews: events.filter(e => e.event_type === 'view').length,
    uniqueVisitors: new Set(events.map(e => e.session_id)).size,
    topLinks: getTopLinks(events),
    deviceBreakdown: getDeviceBreakdown(events),
    timeSeriesData: getTimeSeriesData(events),
    heatmapData: getHeatmapData(events)
  };

  return metrics;
};
```

## 📱 Responsividade Mobile

### Layout Mobile
```typescript
const MobileAnalyticsDashboard = () => {
  return (
    <div className="space-y-4 p-4">
      {/* Cards em grid 2x2 */}
      <div className="grid grid-cols-2 gap-4">
        <CompactMetricCard title="Cliques" value={totalClicks} />
        <CompactMetricCard title="Visualizações" value={totalViews} />
        <CompactMetricCard title="CTR" value={ctr} />
        <CompactMetricCard title="Conversões" value={conversions} />
      </div>

      {/* Gráfico principal */}
      <Card className="p-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Atividade</CardTitle>
        </CardHeader>
        <CardContent>
          <MiniChart data={timeSeriesData} height={200} />
        </CardContent>
      </Card>

      {/* Top Links */}
      <Card className="p-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Top Links</CardTitle>
        </CardHeader>
        <CardContent>
          <TopLinksList data={topLinksData} />
        </CardContent>
      </Card>
    </div>
  );
};
```

## 🚀 Performance e Otimizações

### Lazy Loading
```typescript
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));

// Suspense wrapper
<Suspense fallback={<AnalyticsLoading />}>
  <AnalyticsDashboard />
</Suspense>
```

### Memoização
```typescript
const MemoizedChart = memo(TimeSeriesChart, (prevProps, nextProps) => {
  return (
    prevProps.data.length === nextProps.data.length &&
    prevProps.period === nextProps.period
  );
});
```

### Virtual Scrolling para Tabelas Grandes
```typescript
import { FixedSizeList as List } from 'react-window';

const VirtualizedTable = ({ data }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <TableRow data={data[index]} />
    </div>
  );

  return (
    <List
      height={400}
      itemCount={data.length}
      itemSize={60}
    >
      {Row}
    </List>
  );
};
```

## 📊 Exportação de Relatórios

### PDF Export
```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  const canvas = await html2canvas(element);
  const imgData = canvas.toDataURL('image/png');
  
  const pdf = new jsPDF();
  const imgWidth = 210;
  const pageHeight = 295;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  
  let position = 0;
  
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  
  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  
  pdf.save(filename);
};
```

### CSV Export
```typescript
export const exportToCSV = (data: any[], filename: string) => {
  const csvContent = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
```

## 🔔 Sistema de Alertas

### Configuração de Alertas
```typescript
interface AlertConfig {
  type: 'milestone' | 'spike' | 'drop' | 'inactive';
  threshold: number;
  enabled: boolean;
  channels: ('email' | 'push' | 'dashboard')[];
}

const AlertsSettings = () => {
  const [alerts, setAlerts] = useState<AlertConfig[]>([
    {
      type: 'milestone',
      threshold: 1000,
      enabled: true,
      channels: ['email', 'dashboard']
    },
    {
      type: 'spike',
      threshold: 200, // % increase
      enabled: true,
      channels: ['push', 'dashboard']
    }
  ]);

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Configurar Alertas</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.map((alert, index) => (
          <AlertConfigItem 
            key={index}
            alert={alert}
            onChange={(updated) => updateAlert(index, updated)}
          />
        ))}
      </CardContent>
    </Card>
  );
};
```

Este painel de analytics fornecerá insights valiosos para os usuários do LinkHub, permitindo que otimizem suas estratégias de conteúdo e maximizem o engajamento com seus links.