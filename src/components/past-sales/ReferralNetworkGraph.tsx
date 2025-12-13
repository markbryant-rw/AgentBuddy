import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PastSale } from '@/hooks/usePastSales';
import { Users, DollarSign, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import { formatCurrencyFull } from '@/lib/currencyUtils';
import { cn } from '@/lib/utils';

interface ReferralNetworkGraphProps {
  pastSales: PastSale[];
  onSelectSale?: (sale: PastSale) => void;
}

interface Node {
  id: string;
  type: 'agent' | 'sale';
  label: string;
  sublabel?: string;
  value: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  referralCount: number;
  isReferrer: boolean;
  sale?: PastSale;
}

interface Edge {
  source: string;
  target: string;
  value: number;
}

const NODE_COLORS = {
  agent: 'hsl(var(--primary))',
  referrer: 'hsl(262, 83%, 58%)', // Purple for referrers
  sale: 'hsl(var(--muted-foreground))',
  highlighted: 'hsl(var(--primary))',
};

export function ReferralNetworkGraph({ pastSales, onSelectSale }: ReferralNetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const animationRef = useRef<number | null>(null);

  // Parse connections and create graph data
  const { initialNodes, edges, stats } = useMemo(() => {
    const referralSales = pastSales.filter(sale => 
      sale.lead_source === 'referral' && (sale as any).referral_source_id
    );

    const edges: Edge[] = [];
    const referrerCounts = new Map<string, number>();

    referralSales.forEach(sale => {
      const sourceId = (sale as any).referral_source_id;
      if (sourceId) {
        edges.push({
          source: sourceId,
          target: sale.id,
          value: sale.sale_price || 0,
        });
        referrerCounts.set(sourceId, (referrerCounts.get(sourceId) || 0) + 1);
      }
    });

    // Create nodes for all sales involved in referrals
    const nodeIds = new Set<string>();
    edges.forEach(e => {
      nodeIds.add(e.source);
      nodeIds.add(e.target);
    });

    // Also add referral partners
    pastSales.forEach(sale => {
      if (sale.vendor_details?.primary?.is_referral_partner) {
        nodeIds.add(sale.id);
      }
    });

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;

    const nodesArray: Node[] = [];
    const nodeIdArray = Array.from(nodeIds);

    nodeIdArray.forEach((id, index) => {
      const sale = pastSales.find(s => s.id === id);
      if (!sale) return;

      const vendorName = `${sale.vendor_details?.primary?.first_name || ''} ${sale.vendor_details?.primary?.last_name || ''}`.trim() || 'Unknown';
      const referralCount = referrerCounts.get(id) || 0;
      const isReferrer = referralCount > 0 || sale.vendor_details?.primary?.is_referral_partner;

      // Initial position in a circle
      const angle = (2 * Math.PI * index) / nodeIdArray.length;
      const x = centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 50;
      const y = centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 50;

      nodesArray.push({
        id,
        type: 'sale',
        label: vendorName,
        sublabel: sale.address,
        value: sale.sale_price || 0,
        x,
        y,
        vx: 0,
        vy: 0,
        referralCount,
        isReferrer: isReferrer || false,
        sale,
      });
    });

    const totalValue = edges.reduce((sum, e) => sum + e.value, 0);

    return {
      initialNodes: nodesArray,
      edges,
      stats: {
        totalReferrals: edges.length,
        totalValue,
        nodeCount: nodesArray.length,
      },
    };
  }, [pastSales, dimensions]);

  // Initialize nodes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width || 800, height: 500 });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Force-directed simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulate = () => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(node => ({ ...node }));
        
        // Constants for simulation
        const repulsion = 5000;
        const attraction = 0.01;
        const damping = 0.85;
        const centerForce = 0.001;
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;

        // Apply forces
        newNodes.forEach((node, i) => {
          let fx = 0;
          let fy = 0;

          // Repulsion from other nodes
          newNodes.forEach((other, j) => {
            if (i === j) return;
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = repulsion / (dist * dist);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          });

          // Attraction along edges
          edges.forEach(edge => {
            let other: Node | undefined;
            if (edge.source === node.id) {
              other = newNodes.find(n => n.id === edge.target);
            } else if (edge.target === node.id) {
              other = newNodes.find(n => n.id === edge.source);
            }
            if (other) {
              const dx = other.x - node.x;
              const dy = other.y - node.y;
              fx += dx * attraction;
              fy += dy * attraction;
            }
          });

          // Center gravity
          fx += (centerX - node.x) * centerForce;
          fy += (centerY - node.y) * centerForce;

          // Update velocity and position
          node.vx = (node.vx + fx) * damping;
          node.vy = (node.vy + fy) * damping;
          node.x += node.vx;
          node.y += node.vy;

          // Keep within bounds
          const padding = 50;
          node.x = Math.max(padding, Math.min(dimensions.width - padding, node.x));
          node.y = Math.max(padding, Math.min(dimensions.height - padding, node.y));
        });

        return newNodes;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    // Run simulation for a limited time
    let frames = 0;
    const maxFrames = 300;

    const limitedSimulate = () => {
      if (frames >= maxFrames) return;
      frames++;
      simulate();
    };

    const interval = setInterval(limitedSimulate, 16);
    return () => {
      clearInterval(interval);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [edges, dimensions, initialNodes.length]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setNodes(initialNodes);
  };

  const getNodeSize = (node: Node) => {
    const baseSize = 20;
    const valueScale = Math.log10((node.value || 100000) / 100000 + 1) * 15;
    const referralBonus = node.referralCount * 5;
    return Math.min(baseSize + valueScale + referralBonus, 50);
  };

  const getNodeColor = (node: Node) => {
    if (hoveredNode === node.id || selectedNode === node.id) return NODE_COLORS.highlighted;
    if (node.isReferrer) return NODE_COLORS.referrer;
    return NODE_COLORS.sale;
  };

  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connected = new Set<string>();
    edges.forEach(edge => {
      if (edge.source === hoveredNode) connected.add(edge.target);
      if (edge.target === hoveredNode) connected.add(edge.source);
    });
    return connected;
  }, [hoveredNode, edges]);

  if (nodes.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Referral Network</h3>
            <p className="text-sm text-muted-foreground">Interactive network visualization</p>
          </div>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No referral connections yet</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Mark vendors as referral partners and link new sales to their source to see the network grow
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Referral Network</h3>
            <p className="text-sm text-muted-foreground">
              {stats.nodeCount} contacts · {stats.totalReferrals} connections
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
            <DollarSign className="h-3 w-3 mr-1" />
            {formatCurrencyFull(stats.totalValue)}
          </Badge>
          <div className="flex items-center gap-1 ml-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div 
        ref={containerRef}
        className="relative bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg overflow-hidden"
        style={{ height: 500 }}
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        >
          {/* Edges */}
          <g className="edges">
            {edges.map((edge, i) => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;

              const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target;

              return (
                <motion.line
                  key={`edge-${i}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                  strokeWidth={isHighlighted ? 3 : 1.5}
                  strokeOpacity={hoveredNode && !isHighlighted ? 0.2 : 0.6}
                  strokeDasharray={isHighlighted ? 'none' : '4,4'}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.02 }}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {nodes.map((node, i) => {
              const size = getNodeSize(node);
              const isConnected = connectedNodes.has(node.id);
              const isHovered = hoveredNode === node.id;
              const dimmed = hoveredNode && !isConnected && !isHovered;

              return (
                <TooltipProvider key={node.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.g
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ 
                          scale: 1, 
                          opacity: dimmed ? 0.3 : 1,
                        }}
                        transition={{ 
                          type: 'spring', 
                          stiffness: 300, 
                          damping: 20,
                          delay: i * 0.02 
                        }}
                        whileHover={{ scale: 1.2 }}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => {
                          setSelectedNode(node.id);
                          if (node.sale && onSelectSale) onSelectSale(node.sale);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Glow effect for referrers */}
                        {node.isReferrer && (
                          <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r={size + 8}
                            fill="url(#referrerGlow)"
                            animate={{
                              r: [size + 8, size + 12, size + 8],
                              opacity: [0.3, 0.5, 0.3],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          />
                        )}

                        {/* Node circle */}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={size}
                          fill={getNodeColor(node)}
                          stroke={isHovered ? 'white' : 'transparent'}
                          strokeWidth={3}
                          className="transition-all duration-200"
                        />

                        {/* Referral count badge */}
                        {node.referralCount > 0 && (
                          <g>
                            <circle
                              cx={node.x + size * 0.7}
                              cy={node.y - size * 0.7}
                              r={10}
                              fill="hsl(var(--primary))"
                            />
                            <text
                              x={node.x + size * 0.7}
                              y={node.y - size * 0.7}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="white"
                              fontSize="10"
                              fontWeight="bold"
                            >
                              {node.referralCount}
                            </text>
                          </g>
                        )}

                        {/* Label (shown on hover) */}
                        <AnimatePresence>
                          {isHovered && (
                            <motion.text
                              x={node.x}
                              y={node.y + size + 16}
                              textAnchor="middle"
                              fill="hsl(var(--foreground))"
                              fontSize="12"
                              fontWeight="500"
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                            >
                              {node.label}
                            </motion.text>
                          )}
                        </AnimatePresence>
                      </motion.g>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs z-[12000]">
                      <div className="space-y-1">
                        <p className="font-medium">{node.label}</p>
                        <p className="text-xs text-muted-foreground">{node.sublabel}</p>
                        <p className="text-xs text-emerald-500">{formatCurrencyFull(node.value)}</p>
                        {node.referralCount > 0 && (
                          <p className="text-xs text-purple-500">
                            {node.referralCount} referral{node.referralCount !== 1 ? 's' : ''} generated
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </g>

          {/* Gradients */}
          <defs>
            <radialGradient id="referrerGlow">
              <stop offset="0%" stopColor="hsl(262, 83%, 58%)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(262, 83%, 58%)" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: NODE_COLORS.referrer }} />
            <span>Referrer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-muted-foreground" />
            <span>Sale</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-px w-4 bg-border" style={{ borderStyle: 'dashed' }} />
            <span>Connection</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ReferralNetworkGraph;
