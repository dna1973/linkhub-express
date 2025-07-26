import React, { memo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
} from 'react-simple-maps';

const geoUrl = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';

interface CountryData {
  name: string;
  value: number;
  code?: string;
}

interface WorldHeatmapProps {
  data: CountryData[];
  maxValue: number;
}

const WorldHeatmap: React.FC<WorldHeatmapProps> = ({ data, maxValue }) => {
  const [geoError, setGeoError] = React.useState<string | null>(null);
  

  // Mapeamento de códigos ISO para nomes dos países no mapa
  const countryNameMapping: Record<string, string[]> = {
    'BR': ['Brazil', 'Brasil', 'Federative Republic of Brazil'],
    'US': ['United States of America', 'United States', 'USA', 'US'],
    'GB': ['United Kingdom', 'UK', 'Great Britain'],
    'DE': ['Germany', 'Deutschland', 'Federal Republic of Germany'],
    'FR': ['France', 'French Republic'],
    'IT': ['Italy', 'Italia', 'Italian Republic'],
    'ES': ['Spain', 'España', 'Kingdom of Spain'],
    'PT': ['Portugal', 'Portuguese Republic'],
    'CA': ['Canada'],
    'MX': ['Mexico', 'México', 'United Mexican States'],
    'AR': ['Argentina', 'Argentine Republic'],
    'CL': ['Chile', 'Republic of Chile'],
    'CO': ['Colombia', 'Republic of Colombia'],
    'PE': ['Peru', 'Republic of Peru'],
    'JP': ['Japan', 'Japão'],
    'CN': ['China', 'People\'s Republic of China'],
    'IN': ['India', 'Índia', 'Republic of India'],
    'AU': ['Australia', 'Austrália', 'Commonwealth of Australia'],
    'RU': ['Russia', 'Russian Federation', 'Rússia'],
    'ZA': ['South Africa', 'Republic of South Africa']
  };

  const findCountryData = (geoCountryName: string): CountryData | undefined => {
    if (!geoCountryName) return undefined;
    
    // Primeiro, tentar encontrar por código ISO direto
    const countryByCode = data.find(d => d.code === 'BR' && 
      (geoCountryName.toLowerCase().includes('brazil') || 
       geoCountryName.toLowerCase().includes('brasil'))
    );
    
    if (countryByCode) return countryByCode;
    
    // Segundo, tentar mapeamento por código
    const countryByMapping = data.find(d => {
      if (!d.code) return false;
      const mappedNames = countryNameMapping[d.code] || [];
      return mappedNames.some(name => 
        name.toLowerCase() === geoCountryName.toLowerCase()
      );
    });
    
    if (countryByMapping) return countryByMapping;
    
    // Terceiro, tentar por nome exato
    const countryByName = data.find(d => 
      d.name.toLowerCase() === geoCountryName.toLowerCase()
    );
    
    if (countryByName) return countryByName;
    
    // Quarto, busca parcial
    return data.find(d => 
      d.name.toLowerCase().includes(geoCountryName.toLowerCase()) ||
      geoCountryName.toLowerCase().includes(d.name.toLowerCase())
    );
  };

  const getCountryFill = (geoCountryName: string) => {
    const country = findCountryData(geoCountryName);
    
    if (!country || maxValue === 0) {
      return 'hsl(220, 13%, 91%)'; // Light gray for countries with no data
    }
    
    const intensity = country.value / maxValue;
    
    // Generate heat colors from light blue to dark blue
    if (intensity <= 0.2) {
      return 'hsl(220, 70%, 85%)'; // Very light blue
    } else if (intensity <= 0.4) {
      return 'hsl(220, 70%, 70%)'; // Light blue
    } else if (intensity <= 0.6) {
      return 'hsl(220, 70%, 55%)'; // Medium blue
    } else if (intensity <= 0.8) {
      return 'hsl(220, 70%, 40%)'; // Dark blue
    } else {
      return 'hsl(220, 70%, 25%)'; // Very dark blue
    }
  };

  const getCountryValue = (geoCountryName: string): number => {
    const country = findCountryData(geoCountryName);
    return country?.value || 0;
  };

  if (geoError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">Erro ao carregar mapa mundial</p>
          <p className="text-sm text-muted-foreground">{geoError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Map Container - Takes most of the space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ComposableMap
          projectionConfig={{
            scale: 100,
            center: [0, 20],
          }}
          className="w-full h-full"
        >
          <Graticule stroke="hsl(220, 13%, 85%)" strokeWidth={0.5} />
          <Geographies 
            geography={geoUrl}
            onError={(error) => {
              console.error('❌ Erro ao carregar geografia:', error);
              setGeoError(error.message || 'Falha ao carregar dados do mapa');
            }}
          >
            {({ geographies }) =>
              geographies.map((geo) => {
                // Tentar diferentes propriedades para o nome do país
                const countryName = geo.properties.NAME || 
                                  geo.properties.name || 
                                  geo.properties.NAME_EN || 
                                  geo.properties.NAME_LONG ||
                                  geo.properties.ADMIN ||
                                  'Unknown';
                
                const value = getCountryValue(countryName);
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getCountryFill(countryName)}
                    stroke="hsl(220, 13%, 75%)"
                    strokeWidth={0.5}
                    style={{
                      default: {
                        outline: 'none',
                      },
                      hover: {
                        fill: 'hsl(220, 70%, 30%)',
                        outline: 'none',
                        cursor: 'pointer',
                      },
                      pressed: {
                        outline: 'none',
                      },
                    }}
                  >
                    <title>
                      {countryName}: {value} {value === 1 ? 'acesso' : 'acessos'}
                    </title>
                  </Geography>
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
      
      {/* Legend - Fixed at bottom within card */}
      <div className="flex-shrink-0 pt-2 pb-1">
        <div className="flex items-center justify-center space-x-4 text-sm">
          <span className="text-muted-foreground">Intensidade:</span>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(220, 70%, 85%)' }}></div>
            <span className="text-xs">Baixa</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(220, 70%, 55%)' }}></div>
            <span className="text-xs">Média</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(220, 70%, 25%)' }}></div>
            <span className="text-xs">Alta</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(WorldHeatmap);