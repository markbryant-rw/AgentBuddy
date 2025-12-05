import { useTheme, ThemePack } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Palette, Sparkles, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

function ThemeCard({ theme, isActive, onSelect }: { 
  theme: ThemePack; 
  isActive: boolean; 
  onSelect: () => void;
}) {
  return (
    <Card 
      className={cn(
        "relative cursor-pointer transition-all duration-300 hover-lift overflow-hidden",
        isActive && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={onSelect}
    >
      {/* Color preview strip */}
      <div className="h-20 flex">
        <div 
          className="flex-1" 
          style={{ backgroundColor: `hsl(${theme.colors.primary})` }} 
        />
        <div 
          className="flex-1" 
          style={{ backgroundColor: `hsl(${theme.colors.accent})` }} 
        />
        <div 
          className="flex-1" 
          style={{ backgroundColor: `hsl(${theme.colors.success})` }} 
        />
        <div 
          className="flex-1" 
          style={{ backgroundColor: `hsl(${theme.colors.background})` }} 
        />
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{theme.name}</h3>
            <p className="text-sm text-muted-foreground">{theme.description}</p>
          </div>
          {isActive ? (
            <Badge variant="default" className="bg-primary">
              <Check className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
              Apply
            </Button>
          )}
        </div>
        
        {/* Color swatches */}
        <div className="flex gap-1.5 mt-3">
          <div 
            className="h-6 w-6 rounded-full border-2 border-background shadow-sm" 
            style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
            title="Primary"
          />
          <div 
            className="h-6 w-6 rounded-full border-2 border-background shadow-sm" 
            style={{ backgroundColor: `hsl(${theme.colors.accent})` }}
            title="Accent"
          />
          <div 
            className="h-6 w-6 rounded-full border-2 border-background shadow-sm" 
            style={{ backgroundColor: `hsl(${theme.colors.success})` }}
            title="Success"
          />
          <div 
            className="h-6 w-6 rounded-full border-2 border-background shadow-sm" 
            style={{ backgroundColor: `hsl(${theme.colors.warning})` }}
            title="Warning"
          />
          <div 
            className="h-6 w-6 rounded-full border-2 border-background shadow-sm" 
            style={{ backgroundColor: `hsl(${theme.colors.danger})` }}
            title="Danger"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LivePreview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Live Preview
        </CardTitle>
        <CardDescription>See how components look with the current theme</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Buttons</p>
          <div className="flex flex-wrap gap-2">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </div>

        {/* Badges */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Badges</p>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
          </div>
        </div>

        {/* Sample cards */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Cards</p>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="font-medium">Card Title</p>
              <p className="text-sm text-muted-foreground">Sample content with muted text</p>
            </Card>
            <Card className="p-4 bg-primary/10 border-primary/30">
              <p className="font-medium text-primary">Highlighted Card</p>
              <p className="text-sm text-muted-foreground">With primary accent</p>
            </Card>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Progress</p>
          <div className="space-y-2">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-primary rounded-full" />
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-success rounded-full" style={{ backgroundColor: 'hsl(var(--success))' }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ThemeLibraryTab() {
  const { currentTheme, setTheme, availableThemes } = useTheme();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Library
          </h2>
          <p className="text-muted-foreground">
            Customize the appearance of your platform with pre-built themes
          </p>
        </div>
        <Button variant="outline" disabled className="gap-2">
          <Plus className="h-4 w-4" />
          Create Custom Theme
          <Badge variant="secondary" className="ml-1">Soon</Badge>
        </Button>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={currentTheme.id === theme.id}
            onSelect={() => setTheme(theme.id)}
          />
        ))}
      </div>

      {/* Live Preview */}
      <LivePreview />
    </div>
  );
}