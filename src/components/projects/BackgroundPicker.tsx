import { useState } from 'react';
import { Check, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BackgroundPickerProps {
  currentBackground: string | null | undefined;
  onSelect: (background: string | null) => void;
}

// Solid colors - soft tones
const SOLID_COLORS = [
  { name: 'Slate', value: 'hsl(215 20% 65%)' },
  { name: 'Blue', value: 'hsl(215 80% 60%)' },
  { name: 'Green', value: 'hsl(150 60% 50%)' },
  { name: 'Yellow', value: 'hsl(45 95% 65%)' },
  { name: 'Orange', value: 'hsl(25 90% 60%)' },
  { name: 'Red', value: 'hsl(0 75% 60%)' },
  { name: 'Purple', value: 'hsl(270 70% 65%)' },
  { name: 'Pink', value: 'hsl(340 75% 65%)' },
];

// Beautiful gradients
const GRADIENTS = [
  { name: 'Purple Dream', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Ocean Breeze', value: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)' },
  { name: 'Pink Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Warm Peach', value: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)' },
  { name: 'Aurora', value: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)' },
  { name: 'Sky Blue', value: 'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { name: 'Dark Mode', value: 'linear-gradient(135deg, #434343 0%, #000000 100%)' },
  { name: 'Candy', value: 'linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)' },
];

// Subtle SVG patterns (encoded as data URLs)
const PATTERNS = [
  { 
    name: 'Dots', 
    value: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.15'%3E%3Ccircle cx='3' cy='3' r='1.5'/%3E%3C/g%3E%3C/svg%3E") hsl(var(--muted))` 
  },
  { 
    name: 'Diagonal', 
    value: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40' fill='%239C92AC' fill-opacity='0.1'/%3E%3C/svg%3E") hsl(var(--muted))`
  },
  { 
    name: 'Cross', 
    value: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' fill='hsl(220 20%25 95%25)'/%3E%3Crect x='9' width='2' height='20' fill='%239C92AC' fill-opacity='0.1'/%3E%3Crect y='9' width='20' height='2' fill='%239C92AC' fill-opacity='0.1'/%3E%3C/svg%3E")`
  },
  { 
    name: 'Topography', 
    value: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M50 0c27.614 0 50 22.386 50 50s-22.386 50-50 50S0 77.614 0 50 22.386 0 50 0zm0 10c-22.091 0-40 17.909-40 40s17.909 40 40 40 40-17.909 40-40-17.909-40-40-40zm0 10c16.569 0 30 13.431 30 30s-13.431 30-30 30-30-13.431-30-30 13.431-30 30-30zm0 10c-11.046 0-20 8.954-20 20s8.954 20 20 20 20-8.954 20-20-8.954-20-20-20z' fill='%239C92AC' fill-opacity='0.08' fill-rule='evenodd'/%3E%3C/svg%3E") hsl(var(--muted))`
  },
  { 
    name: 'Circuit', 
    value: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='hsl(220 20%25 95%25)'/%3E%3Cpath d='M0 20h10v2H0zm30 0h10v2H30zM20 0v10h-2V0zm0 30v10h-2V30z' fill='%239C92AC' fill-opacity='0.15'/%3E%3Ccircle cx='20' cy='20' r='3' fill='%239C92AC' fill-opacity='0.15'/%3E%3C/svg%3E")`
  },
  { 
    name: 'Waves', 
    value: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='75' height='100' viewBox='0 0 75 100'%3E%3Crect width='75' height='100' fill='hsl(215 80%25 95%25)'/%3E%3Cpath d='M0 50c25 0 25-50 50-50s25 50 50 50-25 50-50 50S0 100 0 50' fill='none' stroke='%239C92AC' stroke-opacity='0.15' stroke-width='2'/%3E%3C/svg%3E")`
  },
];

export function BackgroundPicker({ currentBackground, onSelect }: BackgroundPickerProps) {
  const [tab, setTab] = useState('gradients');

  const isSelected = (value: string | null) => {
    if (!value && !currentBackground) return true;
    return currentBackground === value;
  };

  return (
    <div className="p-3">
      <p className="text-sm font-medium mb-3">Board Background</p>
      
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3 h-8 mb-3">
          <TabsTrigger value="colors" className="text-xs">Colors</TabsTrigger>
          <TabsTrigger value="gradients" className="text-xs">Gradients</TabsTrigger>
          <TabsTrigger value="patterns" className="text-xs">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="mt-0">
          <div className="grid grid-cols-4 gap-2">
            {/* Clear/None option */}
            <button
              onClick={() => onSelect(null)}
              className={cn(
                "w-full aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-all flex items-center justify-center",
                isSelected(null) && "ring-2 ring-primary ring-offset-2"
              )}
              title="Default"
            >
              <span className="text-xs text-muted-foreground">None</span>
            </button>
            {SOLID_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => onSelect(color.value)}
                className={cn(
                  "w-full aspect-square rounded-lg transition-all hover:scale-105",
                  isSelected(color.value) && "ring-2 ring-primary ring-offset-2"
                )}
                style={{ background: color.value }}
                title={color.name}
              >
                {isSelected(color.value) && (
                  <Check className="h-4 w-4 text-white drop-shadow-md mx-auto" />
                )}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="gradients" className="mt-0">
          <div className="grid grid-cols-4 gap-2">
            {GRADIENTS.map((gradient) => (
              <button
                key={gradient.name}
                onClick={() => onSelect(gradient.value)}
                className={cn(
                  "w-full aspect-square rounded-lg transition-all hover:scale-105",
                  isSelected(gradient.value) && "ring-2 ring-primary ring-offset-2"
                )}
                style={{ background: gradient.value }}
                title={gradient.name}
              >
                {isSelected(gradient.value) && (
                  <Check className="h-4 w-4 text-white drop-shadow-md mx-auto" />
                )}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="mt-0">
          <div className="grid grid-cols-3 gap-2">
            {PATTERNS.map((pattern) => (
              <button
                key={pattern.name}
                onClick={() => onSelect(pattern.value)}
                className={cn(
                  "w-full aspect-square rounded-lg border transition-all hover:scale-105",
                  isSelected(pattern.value) && "ring-2 ring-primary ring-offset-2"
                )}
                style={{ background: pattern.value }}
                title={pattern.name}
              >
                {isSelected(pattern.value) && (
                  <Check className="h-4 w-4 text-foreground mx-auto" />
                )}
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
