import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Undo, 
  Redo, 
  Eye, 
  EyeOff, 
  Smartphone, 
  Tablet, 
  Monitor,
  Download,
  Upload
} from 'lucide-react';
import { useDesignStore } from '@/stores/designStore';
import { EditorSidebar } from './EditorSidebar';
import { PreviewCanvas } from './PreviewCanvas';
import { cn } from '@/lib/utils';
import type { DeviceMode } from '@/types/design-system';

interface DesignEditorProps {
  profileId: string;
  className?: string;
}

export const DesignEditor: React.FC<DesignEditorProps> = ({ 
  profileId, 
  className 
}) => {
  const {
    currentTheme,
    deviceMode,
    isPreviewMode,
    isDirty,
    isLoading,
    error,
    canUndo,
    canRedo,
    setDeviceMode,
    setPreviewMode,
    undo,
    redo,
    saveTheme,
    exportTheme,
    importTheme,
  } = useDesignStore();

  // Auto-save functionality
  useEffect(() => {
    if (isDirty) {
      const autoSaveTimer = setTimeout(() => {
        saveTheme();
      }, 30000); // Auto-save after 30 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [isDirty, saveTheme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 's':
            event.preventDefault();
            saveTheme();
            break;
          case 'p':
            event.preventDefault();
            setPreviewMode(!isPreviewMode);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveTheme, isPreviewMode, setPreviewMode]);

  const handleDeviceChange = (mode: DeviceMode) => {
    setDeviceMode(mode);
  };

  const handleExport = () => {
    const themeJson = exportTheme();
    const blob = new Blob([themeJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTheme.metadata.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          importTheme(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className={cn('h-screen flex flex-col bg-background', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-semibold">Design System 2.0</h1>
          <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">BETA</span>
          {isDirty && (
            <div className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* History Controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo() || isLoading}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo() || isLoading}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Device Mode Controls */}
          <div className="flex items-center space-x-1 bg-muted rounded-md p-1">
            <Button
              variant={deviceMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleDeviceChange('mobile')}
              title="Mobile View"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
            <Button
              variant={deviceMode === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleDeviceChange('tablet')}
              title="Tablet View"
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={deviceMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleDeviceChange('desktop')}
              title="Desktop View"
            >
              <Monitor className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Preview Toggle */}
          <Button
            variant={isPreviewMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode(!isPreviewMode)}
            title="Toggle Preview (Ctrl+P)"
          >
            {isPreviewMode ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Import/Export */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleImport}
            title="Import Theme"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            title="Export Theme"
          >
            <Download className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Save Button */}
          <Button
            onClick={saveTheme}
            disabled={!isDirty || isLoading}
            size="sm"
            title="Save Theme (Ctrl+S)"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border-destructive/20 border-b px-4 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Hidden in preview mode */}
        {!isPreviewMode && (
          <div className="w-96 border-r bg-card overflow-y-auto flex-shrink-0">
            <EditorSidebar profileId={profileId} />
          </div>
        )}

        {/* Preview Canvas */}
        <div className="flex-1 bg-muted/30 min-w-0 overflow-hidden">
          <PreviewCanvas 
            profileId={profileId}
            deviceMode={deviceMode}
            isFullscreen={isPreviewMode}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-card text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>Theme: {currentTheme.metadata.name}</span>
          <span>Device: {deviceMode}</span>
          <span>Version: {currentTheme.metadata.version}</span>
        </div>
        <div className="flex items-center space-x-4">
          {isDirty && <span>Unsaved changes</span>}
          <span>Last saved: {currentTheme.metadata.updatedAt.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};