import React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DEVICES } from './devices';
import type { DeviceBrand } from './devices';

const BRANDS: DeviceBrand[] = ['Apple', 'Samsung'];

interface DeviceSelectProps {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Seletor do aparelho da prévia, agrupado por marca. */
export const DeviceSelect: React.FC<DeviceSelectProps> = ({ value, onChange, className }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label="Aparelho da prévia" className={cn('h-9 w-[200px]', className)}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {BRANDS.map((brand) => (
        <SelectGroup key={brand}>
          <SelectLabel>{brand}</SelectLabel>
          {DEVICES.filter((device) => device.brand === brand).map((device) => (
            <SelectItem key={device.id} value={device.id}>
              {device.name}
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </SelectContent>
  </Select>
);
