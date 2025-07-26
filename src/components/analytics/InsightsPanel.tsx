import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  Users, 
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  priority: 'high' | 'medium' | 'low';
}

interface InsightsPanelProps {
  insights: Insight[];
  loading?: boolean;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  insights,
  loading = false
}) => {
  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'tip':
        return <Lightbulb className="h-4 w-4 text-purple-600" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getInsightBadge = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case 'medium':
        return <Badge variant="default" className="text-xs">Média</Badge>;
      case 'low':
        return <Badge variant="secondary" className="text-xs">Baixa</Badge>;
    }
  };

  const getInsightBorderColor = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
      case 'tip':
        return 'border-l-purple-500';
      default:
        return 'border-l-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border-l-4 border-l-gray-200 pl-4 py-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Colete mais dados para gerar insights personalizados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insights Inteligentes
          <Badge variant="outline" className="ml-auto">
            {insights.length} {insights.length === 1 ? 'insight' : 'insights'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`border-l-4 pl-4 py-3 rounded-r-lg bg-gradient-to-r from-transparent to-gray-50/50 dark:to-gray-900/50 ${getInsightBorderColor(insight.type)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getInsightIcon(insight.type)}
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                </div>
                {getInsightBadge(insight.priority)}
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                {insight.description}
              </p>
              
              {insight.action && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={insight.action.onClick}
                  className="text-xs"
                >
                  {insight.action.label}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Hook para gerar insights automáticos
export const useAnalyticsInsights = (analyticsData: any) => {
  const generateInsights = React.useCallback((): Insight[] => {
    const insights: Insight[] = [];
    
    if (!analyticsData) return insights;
    
    const { totalViews, totalClicks, topLinks, deviceData, timeRange } = analyticsData;
    
    // Insight 1: Taxa de conversão
    const conversionRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    if (conversionRate < 5) {
      insights.push({
        id: 'low-conversion',
        type: 'warning',
        title: 'Taxa de conversão baixa',
        description: `Sua taxa de conversão está em ${conversionRate.toFixed(1)}%. Considere otimizar seus links ou adicionar mais call-to-actions.`,
        priority: 'high',
        action: {
          label: 'Ver dicas de otimização',
          onClick: () => console.log('Navigate to optimization tips')
        }
      });
    } else if (conversionRate > 15) {
      insights.push({
        id: 'high-conversion',
        type: 'success',
        title: 'Excelente taxa de conversão!',
        description: `Parabéns! Sua taxa de conversão de ${conversionRate.toFixed(1)}% está acima da média.`,
        priority: 'low'
      });
    }
    
    // Insight 2: Link mais popular
    if (topLinks && topLinks.length > 0) {
      const topLink = topLinks[0];
      const percentage = totalClicks > 0 ? ((topLink.clicks / totalClicks) * 100).toFixed(1) : 0;
      
      insights.push({
        id: 'top-performer',
        type: 'info',
        title: 'Link mais popular',
        description: `"${topLink.title}" representa ${percentage}% de todos os cliques. Considere criar conteúdo similar.`,
        priority: 'medium'
      });
    }
    
    // Insight 3: Dispositivos
    if (deviceData && deviceData.length > 0) {
      const mobileData = deviceData.find(d => d.name === 'Mobile');
      const mobilePercentage = mobileData ? (mobileData.value / deviceData.reduce((sum, d) => sum + d.value, 0)) * 100 : 0;
      
      if (mobilePercentage > 70) {
        insights.push({
          id: 'mobile-first',
          type: 'tip',
          title: 'Audiência mobile-first',
          description: `${mobilePercentage.toFixed(1)}% dos seus visitantes usam dispositivos móveis. Certifique-se de que sua página está otimizada para mobile.`,
          priority: 'medium'
        });
      }
    }
    
    // Insight 4: Período de atividade
    if (timeRange === '7d' && totalViews < 10) {
      insights.push({
        id: 'low-traffic',
        type: 'tip',
        title: 'Aumente sua visibilidade',
        description: 'Você teve poucas visualizações esta semana. Considere compartilhar seu link em redes sociais ou adicionar à sua bio.',
        priority: 'high',
        action: {
          label: 'Dicas de divulgação',
          onClick: () => console.log('Navigate to promotion tips')
        }
      });
    }
    
    // Insight 5: Sem cliques em alguns links
    if (topLinks && topLinks.length < 3) {
      insights.push({
        id: 'unused-links',
        type: 'warning',
        title: 'Links sem engajamento',
        description: 'Alguns dos seus links não estão recebendo cliques. Considere reordená-los ou atualizar os títulos.',
        priority: 'medium',
        action: {
          label: 'Gerenciar links',
          onClick: () => console.log('Navigate to links management')
        }
      });
    }
    
    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [analyticsData]);
  
  return React.useMemo(() => generateInsights(), [generateInsights]);
};