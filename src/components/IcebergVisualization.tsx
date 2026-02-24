'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Brain, Zap, Heart, Sparkles, Check } from 'lucide-react';

export type IcebergLayer = 'surface' | 'trigger' | 'emotion' | 'coreBelief';

interface LayerConfig {
  id: IcebergLayer;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const layers: LayerConfig[] = [
  {
    id: 'surface',
    label: 'Surface Thought',
    shortLabel: 'Thought',
    description: 'What you shared',
    icon: <Brain className="w-4 h-4" />,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'trigger',
    label: 'The Trigger',
    shortLabel: 'Trigger',
    description: 'What set this off',
    icon: <Zap className="w-4 h-4" />,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'emotion',
    label: 'Deeper Feeling',
    shortLabel: 'Feeling',
    description: 'What\'s underneath',
    icon: <Heart className="w-4 h-4" />,
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-500',
    borderColor: 'border-rose-500/30',
  },
  {
    id: 'coreBelief',
    label: 'Core Belief',
    shortLabel: 'Belief',
    description: 'The deeper truth',
    icon: <Sparkles className="w-4 h-4" />,
    bgColor: 'bg-primary/10',
    textColor: 'text-primary',
    borderColor: 'border-primary/30',
  },
];

interface IcebergVisualizationProps {
  currentLayer: IcebergLayer;
  discoveredInsights: Record<IcebergLayer, string | null>;
}

export function IcebergVisualization({
  currentLayer,
  discoveredInsights,
}: IcebergVisualizationProps) {
  const currentIndex = layers.findIndex((l) => l.id === currentLayer);
  const completedCount = Object.values(discoveredInsights).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Your Journey</h3>
        <p className="text-xs text-muted-foreground mt-1">Peeling back the layers</p>
      </div>

      {/* Layers */}
      <div className="space-y-2">
        {layers.map((layer, index) => {
          const isDiscovered = discoveredInsights[layer.id] !== null;
          const isCurrent = currentLayer === layer.id;
          const isPast = index <= currentIndex;

          return (
            <motion.div
              key={layer.id}
              initial={{ opacity: 0.5, scale: 0.95 }}
              animate={{
                opacity: isPast ? 1 : 0.5,
                scale: isCurrent ? 1.02 : 1,
              }}
              transition={{ duration: 0.3 }}
              className={cn(
                'relative rounded-xl p-4 border transition-all duration-300',
                isDiscovered
                  ? `${layer.bgColor} ${layer.borderColor}`
                  : isCurrent
                  ? 'bg-secondary border-primary/30 ring-2 ring-primary/20'
                  : 'bg-secondary/50 border-border/50'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                    isDiscovered
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                      ? layer.bgColor
                      : 'bg-secondary'
                  )}
                >
                  {isDiscovered ? (
                    <Check className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <span className={isCurrent ? layer.textColor : 'text-muted-foreground'}>
                      {layer.icon}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isDiscovered || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {layer.label}
                    </span>
                    {isCurrent && !isDiscovered && (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {layer.description}
                  </p>

                  {/* Show insight if discovered */}
                  {isDiscovered && discoveredInsights[layer.id] && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-sm text-foreground mt-2 leading-relaxed"
                    >
                      {discoveredInsights[layer.id]}
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Connection line to next layer */}
              {index < layers.length - 1 && (
                <div
                  className={cn(
                    'absolute left-[23px] bottom-0 w-0.5 h-2 translate-y-full',
                    index < currentIndex ? 'bg-primary/30' : 'bg-border'
                  )}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{completedCount} / {layers.length} layers</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / layers.length) * 100}%` }}
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
