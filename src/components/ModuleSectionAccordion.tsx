import { LucideIcon, TrendingUp, Home, MessageSquare, Settings } from 'lucide-react';
import { ModuleId } from '@/hooks/useModuleAccess';
import { MODULE_COLORS, ModuleCategoryColor } from '@/lib/moduleColors';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { DraggableModuleCard } from './DraggableModuleCard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

export type ModuleCategory = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  modules: ModuleId[];
  color: ModuleCategoryColor;
};

export const moduleCategories: ModuleCategory[] = [
  {
    id: 'performance',
    icon: TrendingUp,
    title: 'Performance & Growth',
    description: 'Drive productivity, accountability, and consistent improvement',
    modules: ['kpi-tracking', 'nurture-calculator', 'review-roadmap', 'coaches-corner', 'role-playing'],
    color: 'performance',
  },
  {
    id: 'listings',
    icon: Home,
    title: 'Listings & Transactions',
    description: 'Manage every stage from appraisal to settlement',
    modules: ['listing-pipeline', 'transaction-management', 'vendor-reporting', 'listing-description', 'past-sales-history', 'cma-generator'],
    color: 'listings',
  },
  {
    id: 'communication',
    icon: MessageSquare,
    title: 'Communication & Collaboration',
    description: 'Keep your team connected, informed, and working in sync',
    modules: ['people', 'referrals', 'messages', 'task-manager', 'notes', 'team-meetings'],
    color: 'communication',
  },
  {
    id: 'systems',
    icon: Settings,
    title: 'Systems & Compliance',
    description: 'Streamline operations and maintain professional standards',
    modules: ['compliance', 'feature-request', 'knowledge-base', 'service-directory'],
    color: 'systems',
  },
];

interface ModuleSectionAccordionProps {
  moduleConfig: Record<ModuleId, {
    icon: LucideIcon;
    title: string;
    description: string;
    route: string;
    available?: boolean;
    category: string;
  }>;
  expandedSections: string[];
  onExpandedChange: (sections: string[]) => void;
  moduleOrder: ModuleId[];
  onReorder: (newOrder: ModuleId[]) => void;
}

export const ModuleSectionAccordion = ({
  moduleConfig,
  expandedSections,
  onExpandedChange,
  moduleOrder,
  onReorder,
}: ModuleSectionAccordionProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = moduleOrder.indexOf(active.id as ModuleId);
      const newIndex = moduleOrder.indexOf(over.id as ModuleId);
      const newOrder = arrayMove(moduleOrder, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };
  return (
    <Accordion
      type="single"
      value={expandedSections[0] || ''}
      onValueChange={(value) => onExpandedChange(value ? [value] : [])}
      collapsible
      className="space-y-3"
    >
      {moduleCategories.map((category) => {
        const availableCount = category.modules.filter(
          (moduleId) => moduleConfig[moduleId]?.available !== false
        ).length;
        const comingSoonCount = category.modules.length - availableCount;

        return (
          <AccordionItem
            key={category.id}
            value={category.id}
            className="border rounded-lg bg-card shadow-sm"
          >
            <AccordionTrigger 
              className={cn(
                "group hover:bg-muted/50 px-4 py-4 rounded-lg transition-all",
                "[&[data-state=open]]:rounded-b-none",
                "border-l-4"
              )}
              style={{ 
                borderLeftColor: MODULE_COLORS[category.color].primary,
                background: `linear-gradient(to right, ${MODULE_COLORS[category.color].light}15, transparent)`
              }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div 
                  className={cn("p-2 rounded-lg", MODULE_COLORS[category.color].iconBg)}
                >
                  <category.icon 
                    className="h-5 w-5" 
                    style={{ color: MODULE_COLORS[category.color].primary }}
                  />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-base">{category.title}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {category.description}
                  </div>
                </div>
                <Badge variant="secondary" className="ml-auto mr-2 font-normal">
                  {category.modules.length} {category.modules.length === 1 ? 'tool' : 'tools'}
                  {comingSoonCount > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({comingSoonCount} soon)
                    </span>
                  )}
                </Badge>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={category.modules.filter(id => moduleOrder.includes(id))}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                    {category.modules
                      .filter(id => moduleOrder.includes(id))
                      .sort((a, b) => moduleOrder.indexOf(a) - moduleOrder.indexOf(b))
                      .map((moduleId, index) => {
                        const config = moduleConfig[moduleId];
                        if (!config) return null;

                        return (
                          <div
                            key={moduleId}
                            className="animate-fade-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <DraggableModuleCard
                              icon={config.icon}
                              title={config.title}
                              description={config.description}
                              route={config.route}
                              moduleId={moduleId}
                              available={config.available}
                              categoryColor={category.color}
                            />
                          </div>
                        );
                      })}
                  </div>
                </SortableContext>
              </DndContext>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
