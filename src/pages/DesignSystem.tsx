import { useState } from 'react';
import { 
  Palette, Type, Grid3X3, Sparkles, Layers, Box, 
  ChevronRight, Check, AlertTriangle, Info, X,
  TrendingUp, Flame, FileText, ListChecks, Rocket, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { WorkspaceCard } from '@/components/ui/workspace-card';
import { StatCard } from '@/components/ui/stat-card';
import { LoadingSkeleton, LoadingStatCards } from '@/components/ui/loading-skeleton';
import { workspaceThemes, WorkspaceType } from '@/lib/workspaceTheme';
import { useTheme, themePacks } from '@/contexts/ThemeContext';

export default function DesignSystem() {
  const { currentTheme, setTheme, availableThemes } = useTheme();
  const [activeSection, setActiveSection] = useState('colors');

  const sections = [
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'components', label: 'Components', icon: Box },
    { id: 'workspaces', label: 'Workspaces', icon: Grid3X3 },
    { id: 'animations', label: 'Animations', icon: Sparkles },
    { id: 'themes', label: 'Theme Packs', icon: Layers },
  ];

  const workspaceIcons = {
    plan: TrendingUp,
    prospect: Flame,
    transact: FileText,
    operate: ListChecks,
    grow: Rocket,
    engage: Users,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Design System</h1>
              <p className="text-muted-foreground text-sm">
                AgentBuddy component library and design tokens
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">v1.0</Badge>
              <Badge variant="plan">Theme: {currentTheme.name}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-6 py-8">
        {/* Navigation */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection(section.id)}
              className="gap-2"
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </Button>
          ))}
        </div>

        {/* Colors Section */}
        {activeSection === 'colors' && (
          <div className="space-y-8 animate-card-enter">
            <section>
              <h2 className="text-xl font-semibold mb-4">Primary & Accent Colors</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ColorSwatch label="Primary" color="bg-primary" cssVar="--primary" />
                <ColorSwatch label="Primary Light" color="bg-primary-light" cssVar="--primary-light" />
                <ColorSwatch label="Accent" color="bg-accent" cssVar="--accent" />
                <ColorSwatch label="Accent Light" color="bg-accent-light" cssVar="--accent-light" />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Semantic Colors</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ColorSwatch label="Success" color="bg-success" cssVar="--success" />
                <ColorSwatch label="Warning" color="bg-warning" cssVar="--warning" />
                <ColorSwatch label="Danger" color="bg-danger" cssVar="--danger" />
                <ColorSwatch label="Info" color="bg-info" cssVar="--info" />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Neutral Colors</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ColorSwatch label="Background" color="bg-background border" cssVar="--background" />
                <ColorSwatch label="Foreground" color="bg-foreground" cssVar="--foreground" />
                <ColorSwatch label="Muted" color="bg-muted" cssVar="--muted" />
                <ColorSwatch label="Border" color="bg-border" cssVar="--border" />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Gradients</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="h-24 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-medium">
                  Primary Gradient
                </div>
                <div className="h-24 rounded-lg gradient-accent flex items-center justify-center text-accent-foreground font-medium">
                  Accent Gradient
                </div>
                <div className="h-24 rounded-lg gradient-success flex items-center justify-center text-success-foreground font-medium">
                  Success Gradient
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Typography Section */}
        {activeSection === 'typography' && (
          <div className="space-y-8 animate-card-enter">
            <section>
              <h2 className="text-xl font-semibold mb-4">Font Families</h2>
              <div className="grid gap-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground mb-2">Display / Sans</p>
                    <p className="text-3xl font-display">Plus Jakarta Sans</p>
                    <p className="text-muted-foreground mt-2">The quick brown fox jumps over the lazy dog</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground mb-2">Monospace</p>
                    <p className="text-3xl font-mono">JetBrains Mono</p>
                    <p className="font-mono text-muted-foreground mt-2">const value = 1234.56;</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Fluid Type Scale</h2>
              <div className="space-y-4">
                {['5xl', '4xl', '3xl', '2xl', 'xl', 'lg', 'base', 'sm', 'xs'].map((size) => (
                  <div key={size} className="flex items-baseline gap-4">
                    <span className="w-16 text-sm text-muted-foreground font-mono">{size}</span>
                    <span className={`text-fluid-${size}`}>The quick brown fox</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Components Section */}
        {activeSection === 'components' && (
          <div className="space-y-8 animate-card-enter">
            <section>
              <h2 className="text-xl font-semibold mb-4">Buttons</h2>
              <div className="flex flex-wrap gap-3">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="gradient">Gradient</Button>
                <Button variant="gradient-success">Success</Button>
                <Button variant="glass">Glass</Button>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon"><Check className="h-4 w-4" /></Button>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Badges</h2>
              <div className="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <Badge variant="plan">Plan</Badge>
                <Badge variant="prospect">Prospect</Badge>
                <Badge variant="transact">Transact</Badge>
                <Badge variant="operate">Operate</Badge>
                <Badge variant="grow">Grow</Badge>
                <Badge variant="engage">Engage</Badge>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <Badge variant="success"><Check className="h-3 w-3 mr-1" />Success</Badge>
                <Badge variant="warning"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>
                <Badge variant="danger"><X className="h-3 w-3 mr-1" />Danger</Badge>
                <Badge variant="info"><Info className="h-3 w-3 mr-1" />Info</Badge>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Progress Bars</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Default</p>
                  <Progress value={60} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Animated</p>
                  <Progress value={75} className="progress-animated progress-gradient" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Success</p>
                  <Progress value={100} className="progress-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Warning</p>
                  <Progress value={45} className="progress-warning" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Cards</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Default Card</CardTitle>
                    <CardDescription>A standard card component</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Card content goes here.</p>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardHeader>
                    <CardTitle>Glass Card</CardTitle>
                    <CardDescription>With backdrop blur effect</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Frosted glass aesthetic.</p>
                  </CardContent>
                </Card>
                <Card className="card-gradient-primary">
                  <CardHeader>
                    <CardTitle>Gradient Card</CardTitle>
                    <CardDescription>With subtle gradient background</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Primary gradient variant.</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Stat Cards</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard workspace="plan" icon={TrendingUp} label="Goals" value="12" subValue="3 in progress" />
                <StatCard workspace="prospect" icon={Flame} label="Appraisals" value="45" />
                <StatCard workspace="transact" icon={FileText} label="Transactions" value="8" />
                <StatCard workspace="operate" icon={ListChecks} label="Tasks" value="23" />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Loading States</h2>
              <div className="space-y-4">
                <LoadingStatCards workspace="prospect" count={4} />
                <div className="grid grid-cols-3 gap-4">
                  <LoadingSkeleton variant="card" />
                  <LoadingSkeleton variant="row" />
                  <LoadingSkeleton variant="text" />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Workspaces Section */}
        {activeSection === 'workspaces' && (
          <div className="space-y-8 animate-card-enter">
            <section>
              <h2 className="text-xl font-semibold mb-4">Workspace Themes</h2>
              <p className="text-muted-foreground mb-6">
                Each workspace has a unique color identity for visual distinction.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.keys(workspaceThemes) as WorkspaceType[]).map((workspace) => {
                  const theme = workspaceThemes[workspace];
                  const Icon = workspaceIcons[workspace];
                  return (
                    <Card key={workspace} className={cn('overflow-hidden border-l-4', theme.borderColor)}>
                      <div className={cn('h-2 w-full', theme.accent)} />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn('p-2 rounded-lg', theme.iconBg)}>
                            <Icon className={cn('h-5 w-5', theme.iconColor)} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{theme.name}</h3>
                            <p className="text-xs text-muted-foreground">{workspace}</p>
                          </div>
                        </div>
                        <div className={cn('h-12 rounded-lg bg-gradient-to-r', theme.gradient)} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Workspace Cards (Full)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.keys(workspaceThemes) as WorkspaceType[]).map((workspace) => {
                  const Icon = workspaceIcons[workspace];
                  return (
                    <WorkspaceCard
                      key={workspace}
                      workspace={workspace}
                      title={workspaceThemes[workspace].name}
                      description={`The ${workspace} workspace`}
                      icon={Icon}
                      route={workspaceThemes[workspace].route}
                      stats={[
                        { label: 'Active', value: Math.floor(Math.random() * 20) },
                        { label: 'Pending', value: Math.floor(Math.random() * 10) },
                      ]}
                    />
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* Animations Section */}
        {activeSection === 'animations' && (
          <div className="space-y-8 animate-card-enter">
            <section>
              <h2 className="text-xl font-semibold mb-4">Micro-Interactions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="hover-lift cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <p className="font-medium">Hover Lift</p>
                    <p className="text-sm text-muted-foreground">Hover to see effect</p>
                  </CardContent>
                </Card>
                <Card className="hover-scale-subtle cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <p className="font-medium">Hover Scale</p>
                    <p className="text-sm text-muted-foreground">Subtle scale on hover</p>
                  </CardContent>
                </Card>
                <Card className="transition-all duration-300 hover:shadow-glow-primary cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <p className="font-medium">Glow Effect</p>
                    <p className="text-sm text-muted-foreground">Primary color glow</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Entrance Animations</h2>
              <AnimationDemo />
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Shimmer Effects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="gradient" shimmer className="w-full">
                  Shimmer Button
                </Button>
                <div className="h-12 skeleton-shimmer rounded-lg" />
              </div>
            </section>
          </div>
        )}

        {/* Themes Section */}
        {activeSection === 'themes' && (
          <div className="space-y-8 animate-card-enter">
            <section>
              <h2 className="text-xl font-semibold mb-4">Available Theme Packs</h2>
              <p className="text-muted-foreground mb-6">
                Switch between themes to customize the entire application appearance.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {availableThemes.map((theme) => (
                  <Card 
                    key={theme.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-lg',
                      currentTheme.id === theme.id && 'ring-2 ring-primary'
                    )}
                    onClick={() => setTheme(theme.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{theme.name}</h3>
                        {currentTheme.id === theme.id && (
                          <Badge variant="success"><Check className="h-3 w-3" /></Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{theme.description}</p>
                      <div className="flex gap-1">
                        <div 
                          className="h-6 w-6 rounded-full" 
                          style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
                        />
                        <div 
                          className="h-6 w-6 rounded-full" 
                          style={{ backgroundColor: `hsl(${theme.colors.accent})` }}
                        />
                        <div 
                          className="h-6 w-6 rounded-full" 
                          style={{ backgroundColor: `hsl(${theme.colors.success})` }}
                        />
                        <div 
                          className="h-6 w-6 rounded-full" 
                          style={{ backgroundColor: `hsl(${theme.colors.warning})` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Theme Architecture</h2>
              <Card>
                <CardContent className="p-6">
                  <pre className="text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
{`// Using the ThemeContext
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { currentTheme, setTheme, availableThemes } = useTheme();
  
  // Switch theme
  setTheme('raywhite');
  
  // Access current theme colors
  console.log(currentTheme.colors.primary);
}`}
                  </pre>
                </CardContent>
              </Card>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function ColorSwatch({ label, color, cssVar }: { label: string; color: string; cssVar: string }) {
  return (
    <div className="space-y-2">
      <div className={cn('h-20 rounded-lg', color)} />
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground font-mono">{cssVar}</p>
      </div>
    </div>
  );
}

function AnimationDemo() {
  const [key, setKey] = useState(0);
  
  return (
    <div className="space-y-4">
      <Button onClick={() => setKey(k => k + 1)} variant="outline" size="sm">
        Replay Animation
      </Button>
      <div key={key} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card 
            key={i} 
            className={cn('animate-card-enter', `stagger-${i}`)}
            style={{ animationFillMode: 'backwards' }}
          >
            <CardContent className="p-4 text-center">
              <p className="font-medium">Card {i}</p>
              <p className="text-xs text-muted-foreground">Stagger {i}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
