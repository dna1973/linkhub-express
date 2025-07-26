import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CountryData {
  name: string;
  value: number;
  code?: string;
}

interface WorldHeatmapDebugProps {
  data: CountryData[];
  maxValue: number;
}

export const WorldHeatmapDebug: React.FC<WorldHeatmapDebugProps> = ({ data, maxValue }) => {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>🔍 Debug - Dados do Mapa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Dados Recebidos:</h4>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto">
              {JSON.stringify({ data, maxValue }, null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Resumo:</h4>
            <ul className="text-sm space-y-1">
              <li>• Total de países: {data.length}</li>
              <li>• Valor máximo: {maxValue}</li>
              <li>• Países com código: {data.filter(d => d.code).length}</li>
              <li>• Países sem código: {data.filter(d => !d.code).length}</li>
            </ul>
          </div>
          
          {data.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Lista de Países:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {data.map((country, index) => (
                  <div key={index} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span>
                      {country.name} {country.code && `(${country.code})`}
                    </span>
                    <span className="font-mono">{country.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};