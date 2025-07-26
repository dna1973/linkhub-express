import React, { memo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
} from 'react-simple-maps';

const geoUrl = 'https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json';

interface CountryData {
  name: string;
  value: number;
}

interface WorldHeatmapProps {
  data: CountryData[];
  maxValue: number;
}

const WorldHeatmap: React.FC<WorldHeatmapProps> = ({ data, maxValue }) => {
  const getCountryFill = (countryName: string) => {
    const country = data.find(d => 
      d.name.toLowerCase() === countryName.toLowerCase() ||
      d.name.toLowerCase().includes(countryName.toLowerCase()) ||
      countryName.toLowerCase().includes(d.name.toLowerCase())
    );
    
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

  const getCountryValue = (countryName: string): number => {
    const country = data.find(d => 
      d.name.toLowerCase() === countryName.toLowerCase() ||
      d.name.toLowerCase().includes(countryName.toLowerCase()) ||
      countryName.toLowerCase().includes(d.name.toLowerCase())
    );
    return country?.value || 0;
  };

  return (
    <div className="w-full h-full">
      <ComposableMap
        projectionConfig={{
          scale: 100,
          center: [0, 20],
        }}
        className="w-full h-full"
      >
        <Graticule stroke="hsl(220, 13%, 85%)" strokeWidth={0.5} />
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const countryName = geo.properties.NAME;
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
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
        <span className="text-muted-foreground">Intensidade:</span>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(220, 70%, 85%)' }}></div>
          <span className="text-xs">Baixa</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(220, 70%, 55%)' }}></div>
          <span className="text-xs">Média</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(220, 70%, 25%)' }}></div>
          <span className="text-xs">Alta</span>
        </div>
      </div>
    </div>
  );
};

export default memo(WorldHeatmap);