import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  format?: 'number' | 'percentage' | 'currency';
  gradient?: string;
  loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  change,
  changeType,
  icon: Icon,
  description,
  format = 'number',
  gradient = 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
  loading = false
}) => {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'currency':
        return `R$ ${val.toFixed(2)}`;
      default:
        return val.toLocaleString();
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-3 w-3" />;
      case 'decrease':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600 dark:text-green-400';
      case 'decrease':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getBadgeVariant = () => {
    switch (changeType) {
      case 'increase':
        return 'default';
      case 'decrease':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card className={cn('bg-gradient-to-br', gradient, 'border-opacity-50')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium opacity-70">
            {title}
          </CardTitle>
          <div className="h-4 w-4 bg-current opacity-30 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-current opacity-20 rounded animate-pulse mb-2" />
          <div className="h-4 bg-current opacity-10 rounded animate-pulse w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-gradient-to-br', gradient, 'border-opacity-50 hover:shadow-lg transition-shadow')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium opacity-80">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 opacity-70" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold opacity-90">
            {formatValue(value)}
          </div>
          
          {change !== undefined && (
            <Badge 
              variant={getBadgeVariant()}
              className="flex items-center gap-1 text-xs"
            >
              {getChangeIcon()}
              {Math.abs(change).toFixed(1)}%
            </Badge>
          )}
        </div>
        
        {description && (
          <p className="text-xs opacity-60 mt-1">
            {description}
          </p>
        )}
        
        {previousValue !== undefined && (
          <p className={cn('text-xs mt-1 flex items-center gap-1', getChangeColor())}>
            {changeType === 'increase' ? 'Aumento' : changeType === 'decrease' ? 'Diminuição' : 'Sem alteração'} em relação ao período anterior ({formatValue(previousValue)})
          </p>
        )}
      </CardContent>
    </Card>
  );
};