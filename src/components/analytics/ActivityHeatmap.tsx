import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityData {
  hour: number;
  day: number; // 0 = Sunday, 1 = Monday, etc.
  count: number;
  date?: Date;
}

interface ActivityHeatmapProps {
  data: ActivityData[];
  maxValue?: number;
  title?: string;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  data,
  maxValue,
  title = "Heatmap de Atividade"
}) => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const maxCount = maxValue || Math.max(...data.map(d => d.count), 1);
  
  const getActivityForHour = (day: number, hour: number): ActivityData | undefined => {
    return data.find(d => d.day === day && d.hour === hour);
  };
  
  const getIntensity = (count: number): string => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    
    const intensity = count / maxCount;
    if (intensity <= 0.25) return 'bg-blue-200 dark:bg-blue-900';
    if (intensity <= 0.5) return 'bg-blue-400 dark:bg-blue-700';
    if (intensity <= 0.75) return 'bg-blue-600 dark:bg-blue-500';
    return 'bg-blue-800 dark:bg-blue-300';
  };
  
  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Menos ativo</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-sm" />
              <div className="w-3 h-3 bg-blue-200 dark:bg-blue-900 rounded-sm" />
              <div className="w-3 h-3 bg-blue-400 dark:bg-blue-700 rounded-sm" />
              <div className="w-3 h-3 bg-blue-600 dark:bg-blue-500 rounded-sm" />
              <div className="w-3 h-3 bg-blue-800 dark:bg-blue-300 rounded-sm" />
            </div>
            <span>Mais ativo</span>
          </div>
          
          {/* Heatmap Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Hour labels */}
              <div className="flex mb-2">
                <div className="w-12" /> {/* Space for day labels */}
                {hours.filter((_, i) => i % 2 === 0).map(hour => (
                  <div key={hour} className="flex-1 text-xs text-center text-muted-foreground">
                    {formatHour(hour)}
                  </div>
                ))}
              </div>
              
              {/* Heatmap rows */}
              <TooltipProvider>
                {days.map((dayName, dayIndex) => (
                  <div key={dayIndex} className="flex items-center mb-1">
                    <div className="w-12 text-xs text-muted-foreground text-right pr-2">
                      {dayName}
                    </div>
                    <div className="flex-1 flex gap-1">
                      {hours.map(hour => {
                        const activity = getActivityForHour(dayIndex, hour);
                        const count = activity?.count || 0;
                        
                        return (
                          <Tooltip key={hour}>
                            <TooltipTrigger asChild>
                              <div
                                className={`
                                  flex-1 h-4 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-blue-400
                                  ${getIntensity(count)}
                                `}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-center">
                                <p className="font-medium">
                                  {dayName}, {formatHour(hour)}
                                </p>
                                <p className="text-sm">
                                  {count} {count === 1 ? 'atividade' : 'atividades'}
                                </p>
                                {activity?.date && (
                                  <p className="text-xs text-muted-foreground">
                                    {format(activity.date, 'dd/MM/yyyy', { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </TooltipProvider>
            </div>
          </div>
          
          {/* Summary */}
          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Total de atividades: {data.reduce((sum, d) => sum + d.count, 0)}</span>
            <span>Pico: {maxCount} atividades</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};