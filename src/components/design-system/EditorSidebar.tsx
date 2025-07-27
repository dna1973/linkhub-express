import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Palette, 
  Type, 
  MousePointer, 
  Layout, 
  Sparkles, 
  Image,
  Settings
} from 'lucide-react';
import { useActivePanel, useDesignStore } from '@/stores/designStore';
import { BackgroundPanel } from './background';
import { TypographyPanel } from './typography';
import { ButtonsPanel } from './buttons';
import { LayoutPanel } from './layout';

interface EditorSidebarProps {
  profileId: string;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({ profileId }) => {
  const activePanel = useActivePanel();
  const setActivePanel = useDesignStore((state) => state.setActivePanel);

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activePanel} onValueChange={setActivePanel} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 gap-1 p-1 m-2">
          <TabsTrigger value="background" className="flex flex-col items-center gap-1 p-2">
            <Image className="h-4 w-4" />
            <span className="text-xs">Background</span>
          </TabsTrigger>
          <TabsTrigger value="typography" className="flex flex-col items-center gap-1 p-2">
            <Type className="h-4 w-4" />
            <span className="text-xs">Typography</span>
          </TabsTrigger>
          <TabsTrigger value="buttons" className="flex flex-col items-center gap-1 p-2">
            <MousePointer className="h-4 w-4" />
            <span className="text-xs">Buttons</span>
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex flex-col items-center gap-1 p-2">
            <Layout className="h-4 w-4" />
            <span className="text-xs">Layout</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <TabsContent value="background" className="p-4 space-y-6">
              <BackgroundPanel profileId={profileId} />
            </TabsContent>

            <TabsContent value="typography" className="p-4 space-y-6">
              <TypographyPanel profileId={profileId} />
            </TabsContent>

            <TabsContent value="buttons" className="mt-0 h-full">
              <ButtonsPanel />
            </TabsContent>

            <TabsContent value="layout" className="mt-0 h-full">
              <LayoutPanel />
            </TabsContent>
          </ScrollArea>
        </div>

        {/* Additional Tabs Row */}
        <div className="border-t p-2">
          <TabsList className="grid w-full grid-cols-3 gap-1 p-1">
            <TabsTrigger value="colors" className="flex flex-col items-center gap-1 p-2">
              <Palette className="h-4 w-4" />
              <span className="text-xs">Colors</span>
            </TabsTrigger>
            <TabsTrigger value="effects" className="flex flex-col items-center gap-1 p-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs">Effects</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col items-center gap-1 p-2">
              <Settings className="h-4 w-4" />
              <span className="text-xs">Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Additional Tab Contents */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <TabsContent value="colors" className="p-4 space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Color System</h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Intelligent color system will be implemented here.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Features: Color palettes, harmony generation, contrast checking, trending colors
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="effects" className="p-4 space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Visual Effects</h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Visual effects panel will be implemented here.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Features: Animations, micro-interactions, glassmorphism, neumorphism, glow effects
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="p-4 space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Theme Settings</h3>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Theme settings and metadata will be implemented here.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Features: Theme name, description, tags, export/import, templates
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  );
};