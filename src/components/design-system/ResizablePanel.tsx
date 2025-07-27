import React from 'react';
import { cn } from '@/lib/utils';
import { useResizable } from '@/hooks/useResizable';
import { GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResizablePanelProps {
  children: React.ReactNode;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  className?: string;
  collapsible?: boolean;
  onWidthChange?: (width: number) => void;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  initialWidth = 320,
  minWidth = 240,
  maxWidth = 600,
  storageKey = 'resizable-panel-width',
  className,
  collapsible = true,
  onWidthChange
}) => {
  const { width, isResizing, handleMouseDown, setWidth } = useResizable({
    initialWidth,
    minWidth,
    maxWidth,
    storageKey
  });

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  React.useEffect(() => {
    onWidthChange?.(width);
  }, [width, onWidthChange]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const effectiveWidth = isCollapsed ? 48 : width; // 48px for collapsed state (icon only)

  return (
    <div className="flex">
      {/* Panel Content */}
      <div 
        className={cn(
          'relative bg-card border-r transition-all duration-200 ease-in-out overflow-hidden',
          className
        )}
        style={{ width: effectiveWidth }}
      >
        {/* Collapse Toggle Button */}
        {collapsible && (
          <div className="absolute top-2 right-2 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-6 w-6 p-0"
              title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronLeft className="h-3 w-3" />
              )}
            </Button>
          </div>
        )}

        {/* Panel Content */}
        <div className={cn(
          'h-full transition-opacity duration-200',
          isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}>
          {children}
        </div>

        {/* Collapsed State - Show minimal icons */}
        {isCollapsed && (
          <div className="absolute inset-0 flex flex-col items-center justify-start pt-12 space-y-4">
            <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
              <span className="text-xs font-medium">D</span>
            </div>
            <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
              <span className="text-xs font-medium">S</span>
            </div>
            <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
              <span className="text-xs font-medium">L</span>
            </div>
          </div>
        )}
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          className={cn(
            'w-1 bg-border hover:bg-primary/20 cursor-col-resize transition-colors relative group',
            isResizing && 'bg-primary/30'
          )}
          onMouseDown={handleMouseDown}
        >
          {/* Visual indicator */}
          <div className="absolute inset-y-0 left-0 w-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Invisible wider area for easier grabbing */}
          <div className="absolute inset-y-0 -left-2 -right-2 w-5" />
        </div>
      )}
    </div>
  );
};
