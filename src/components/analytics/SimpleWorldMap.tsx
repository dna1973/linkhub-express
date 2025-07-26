import React from 'react';

interface CountryData {
  name: string;
  value: number;
  code?: string;
}

interface SimpleWorldMapProps {
  data: CountryData[];
  maxValue: number;
}

export const SimpleWorldMap: React.FC<SimpleWorldMapProps> = ({ data, maxValue }) => {
  // Dados de teste para verificar se o componente funciona
  const testData = [
    { name: 'Brazil', value: 10, code: 'BR' },
    { name: 'United States', value: 5, code: 'US' },
    { name: 'Germany', value: 3, code: 'DE' }
  ];

  const dataToUse = data.length > 0 ? data : testData;
  const maxValueToUse = maxValue > 0 ? maxValue : Math.max(...testData.map(d => d.value));

  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Mapa Simplificado (Teste)</h3>
        <p className="text-sm text-muted-foreground">
          Usando {data.length > 0 ? 'dados reais' : 'dados de teste'}
        </p>
      </div>
      
      <div className="space-y-2">
        {dataToUse.map((country, index) => {
          const intensity = country.value / maxValueToUse;
          const opacity = Math.max(0.2, intensity);
          
          return (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border"
              style={{
                backgroundColor: `rgba(59, 130, 246, ${opacity})`,
                color: intensity > 0.5 ? 'white' : 'inherit'
              }}
            >
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {country.name} {country.code && `(${country.code})`}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm">
                  {country.value} {country.value === 1 ? 'acesso' : 'acessos'}
                </span>
                <div className="text-xs opacity-75">
                  {(intensity * 100).toFixed(1)}% intensidade
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
        <span className="text-muted-foreground">Intensidade:</span>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}></div>
          <span className="text-xs">Baixa</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.6)' }}></div>
          <span className="text-xs">Média</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 1)' }}></div>
          <span className="text-xs">Alta</span>
        </div>
      </div>
    </div>
  );
};