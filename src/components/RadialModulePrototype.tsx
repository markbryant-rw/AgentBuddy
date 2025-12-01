import { LucideIcon } from 'lucide-react';
import { ModuleId } from '@/hooks/useModuleAccess';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface ModuleConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  route: string;
  available: boolean;
  category: string;
}

interface CategoryMetadata {
  name: string;
  icon: LucideIcon;
  description: string;
}

interface RadialModulePrototypeProps {
  modules: Record<ModuleId, ModuleConfig>;
  modulesByCategory: Record<string, ModuleId[]>;
  categoryMeta: Record<string, CategoryMetadata>;
  categoryColors: Record<string, string>;
  expandedCategory: string | null;
  onCategoryClick: (category: string) => void;
  onModuleClick: (moduleId: ModuleId) => void;
  userAvatar?: string;
  userName?: string;
}

export const RadialModulePrototype = ({
  modules,
  modulesByCategory,
  categoryMeta,
  categoryColors,
  expandedCategory,
  onCategoryClick,
  onModuleClick,
  userAvatar,
  userName = 'Hub',
}: RadialModulePrototypeProps) => {
  // SVG configuration
  const centerX = 250;
  const centerY = 250;
  
  // Concentric ring radii
  const innerRingInner = 60;   // Center circle edge
  const innerRingOuter = 120;  // Where categories end
  const outerRingInner = 120;  // Where modules start
  const outerRingOuter = 200;  // Outer edge
  
  const categories = Object.keys(categoryMeta);
  const totalCategories = categories.length;

  const polarToCartesian = (angle: number, radius: number) => {
    const radians = (angle - 90) * Math.PI / 180;
    return {
      x: centerX + radius * Math.cos(radians),
      y: centerY + radius * Math.sin(radians)
    };
  };

  const createRingPath = (startAngle: number, endAngle: number, innerR: number, outerR: number) => {
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    const start = polarToCartesian(startAngle, outerR);
    const end = polarToCartesian(endAngle, outerR);
    const innerStart = polarToCartesian(startAngle, innerR);
    const innerEnd = polarToCartesian(endAngle, innerR);

    return `
      M ${start.x} ${start.y}
      A ${outerR} ${outerR} 0 ${largeArc} 1 ${end.x} ${end.y}
      L ${innerEnd.x} ${innerEnd.y}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}
      Z
    `;
  };
  
  const getTextPosition = (startAngle: number, endAngle: number, radius: number) => {
    const midAngle = (startAngle + endAngle) / 2;
    return polarToCartesian(midAngle, radius);
  };

  // Calculate angles based on expansion state
  const getCategoryAngles = (categoryIndex: number) => {
    const anglePerCategory = 360 / totalCategories;
    const startAngle = categoryIndex * anglePerCategory;
    const endAngle = startAngle + anglePerCategory;
    return { startAngle, endAngle };
  };
  
  const getModuleAngles = (categoryStartAngle: number, categoryEndAngle: number, moduleIndex: number, totalModules: number) => {
    const categoryRange = categoryEndAngle - categoryStartAngle;
    const anglePerModule = categoryRange / totalModules;
    return {
      startAngle: categoryStartAngle + (moduleIndex * anglePerModule),
      endAngle: categoryStartAngle + ((moduleIndex + 1) * anglePerModule)
    };
  };

  const allModules = modules;

  return (
    <div className="relative w-full flex flex-col items-center gap-6">
      <svg
        viewBox="0 0 500 500"
        className="w-full max-w-[500px] h-auto"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
      >
        <defs>
          <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* INNER RING - Categories (Always Visible) */}
        <g>
          {categories.map((category, index) => {
            const { startAngle, endAngle } = getCategoryAngles(index);
            const path = createRingPath(startAngle, endAngle, innerRingInner, innerRingOuter);
            const isExpanded = expandedCategory === category;
            const isOtherExpanded = expandedCategory && expandedCategory !== category;
            const textPos = getTextPosition(startAngle, endAngle, (innerRingInner + innerRingOuter) / 2);
            const CategoryIcon = categoryMeta[category].icon;
            const moduleCount = modulesByCategory[category]?.length || 0;

            return (
              <g key={category}>
                {/* Category Segment */}
                <motion.path
                  d={path}
                  fill="url(#gradient-primary)"
                  stroke="hsl(var(--border))"
                  strokeWidth="2"
                  className="cursor-pointer"
                  initial={{ opacity: 1 }}
                  animate={{
                    opacity: isOtherExpanded ? 0.5 : 1,
                    filter: isExpanded ? 'brightness(1.2)' : 'brightness(1)'
                  }}
                  whileHover={{
                    filter: 'brightness(1.3)',
                    scale: 1.02
                  }}
                  transition={{ duration: 0.3 }}
                  onClick={() => onCategoryClick(category)}
                />

                {/* Category Text Label */}
                <motion.text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-primary-foreground font-semibold text-sm pointer-events-none select-none"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: isOtherExpanded ? 0.6 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {categoryMeta[category].name}
                </motion.text>

                {/* Small icon below text */}
                <motion.g
                  transform={`translate(${textPos.x - 8}, ${textPos.y + 12})`}
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: isOtherExpanded ? 0.4 : 0.7 }}
                  transition={{ duration: 0.3 }}
                  className="pointer-events-none"
                >
                  <CategoryIcon size={16} className="text-primary-foreground" />
                </motion.g>

                {/* Module count badge */}
                {!isExpanded && moduleCount > 0 && (
                  <motion.g
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: isOtherExpanded ? 0.5 : 0.8 }}
                  >
                    <circle
                      cx={textPos.x + 35}
                      cy={textPos.y - 15}
                      r="10"
                      fill="hsl(var(--primary))"
                      className="pointer-events-none"
                    />
                    <text
                      x={textPos.x + 35}
                      y={textPos.y - 15}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-primary-foreground text-xs font-bold pointer-events-none select-none"
                    >
                      {moduleCount}
                    </text>
                  </motion.g>
                )}
              </g>
            );
          })}
        </g>

        {/* OUTER RING - Modules (Conditional) */}
        {expandedCategory && (
          <g>
            {modulesByCategory[expandedCategory]?.map((moduleId, moduleIndex) => {
              const module = allModules[moduleId];
              if (!module) return null;

              const categoryIndex = categories.indexOf(expandedCategory);
              const { startAngle: catStart, endAngle: catEnd } = getCategoryAngles(categoryIndex);
              const totalModules = modulesByCategory[expandedCategory].length;
              const { startAngle, endAngle } = getModuleAngles(catStart, catEnd, moduleIndex, totalModules);
              
              const path = createRingPath(startAngle, endAngle, outerRingInner, outerRingOuter);
              const textPos = getTextPosition(startAngle, endAngle, (outerRingInner + outerRingOuter) / 2);
              const isAvailable = module.available;

              return (
                <g key={moduleId}>
                  {/* Module Segment */}
                  <motion.path
                    d={path}
                    fill="hsl(var(--primary) / 0.6)"
                    stroke="hsl(var(--border))"
                    strokeWidth="1.5"
                    className={isAvailable ? "cursor-pointer" : "cursor-not-allowed"}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ 
                      duration: 0.3, 
                      delay: moduleIndex * 0.05,
                      ease: "easeOut"
                    }}
                    whileHover={isAvailable ? {
                      fill: "hsl(var(--primary) / 0.8)",
                      scale: 1.05
                    } : {}}
                    onClick={() => isAvailable && onModuleClick(moduleId)}
                  />

                  {/* Module Text Label */}
                  <motion.text
                    x={textPos.x}
                    y={textPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-primary-foreground text-xs font-medium pointer-events-none select-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isAvailable ? 1 : 0.5 }}
                    transition={{ duration: 0.3, delay: moduleIndex * 0.05 }}
                  >
                    {module.title}
                  </motion.text>

                  {/* Lock icon for unavailable modules */}
                  {!isAvailable && (
                    <motion.g
                      transform={`translate(${textPos.x - 6}, ${textPos.y + 12})`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      transition={{ duration: 0.3, delay: moduleIndex * 0.05 }}
                      className="pointer-events-none"
                    >
                      <Lock size={12} className="text-primary-foreground" />
                    </motion.g>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Center Circle */}
        <g>
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={innerRingInner}
            fill="hsl(var(--card))"
            stroke="hsl(var(--border))"
            strokeWidth="2"
            className="cursor-pointer"
            whileHover={{ scale: 1.05 }}
            onClick={() => expandedCategory && onCategoryClick(expandedCategory)}
          />
          
          {/* User Avatar in Center */}
          <foreignObject
            x={centerX - 30}
            y={centerY - 30}
            width="60"
            height="60"
            className="pointer-events-none"
          >
            <div className="flex items-center justify-center w-full h-full">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                  {userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </foreignObject>
        </g>
      </svg>
      
      {/* Bottom Instructions */}
      <div className="w-full max-w-[500px] px-4">
        {!expandedCategory ? (
          <p className="text-sm text-muted-foreground text-center">
            Click a category to explore its modules
          </p>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            Click the center to collapse • Click a module to open
          </p>
        )}
      </div>
    </div>
  );
};
