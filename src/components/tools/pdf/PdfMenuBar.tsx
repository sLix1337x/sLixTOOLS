import React, { useState, useRef, useEffect } from 'react';
import { Eye, Download, Upload, Save, Printer, X, Undo2, Redo2, Copy, Scissors, Clipboard, Search, ZoomIn, ZoomOut, Maximize2, PanelLeft, Grid3x3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PdfMenuBarProps {
  onOpenFile: () => void;
  onSave: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onClose: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFind: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToPage: () => void;
  onFitToWidth: () => void;
  onActualSize: () => void;
  onToggleSidebar: () => void;
  onFullScreen: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasDocument: boolean;
  sidebarVisible: boolean;
  hasUnsavedChanges?: boolean;
}

type MenuItem = {
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
};

type Menu = {
  label: string;
  items: MenuItem[];
};

const PdfMenuBar = ({
  onOpenFile,
  onSave,
  onDownload,
  onPrint,
  onClose,
  onUndo,
  onRedo,
  onFind,
  onZoomIn,
  onZoomOut,
  onFitToPage,
  onFitToWidth,
  onActualSize,
  onToggleSidebar,
  onFullScreen,
  canUndo,
  canRedo,
  hasDocument,
  sidebarVisible,
  hasUnsavedChanges = false
}: PdfMenuBarProps) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'Open...', icon: <Upload className="h-4 w-4" />, shortcut: 'Ctrl+O', action: onOpenFile },
        { label: 'Save', icon: <Save className="h-4 w-4" />, shortcut: 'Ctrl+S', action: onSave, disabled: !hasDocument },
        { label: 'Download', icon: <Download className="h-4 w-4" />, shortcut: 'Ctrl+D', action: onDownload, disabled: !hasDocument },
        { separator: true },
        { label: 'Print...', icon: <Printer className="h-4 w-4" />, shortcut: 'Ctrl+P', action: onPrint, disabled: !hasDocument },
        { separator: true },
        { label: 'Close', icon: <X className="h-4 w-4" />, action: onClose, disabled: !hasDocument }
      ]
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', icon: <Undo2 className="h-4 w-4" />, shortcut: 'Ctrl+Z', action: onUndo, disabled: !canUndo },
        { label: 'Redo', icon: <Redo2 className="h-4 w-4" />, shortcut: 'Ctrl+Y', action: onRedo, disabled: !canRedo },
        { separator: true },
        { label: 'Cut', icon: <Scissors className="h-4 w-4" />, shortcut: 'Ctrl+X', disabled: !hasDocument },
        { label: 'Copy', icon: <Copy className="h-4 w-4" />, shortcut: 'Ctrl+C', disabled: !hasDocument },
        { label: 'Paste', icon: <Clipboard className="h-4 w-4" />, shortcut: 'Ctrl+V', disabled: !hasDocument },
        { separator: true },
        { label: 'Find...', icon: <Search className="h-4 w-4" />, shortcut: 'Ctrl+F', action: onFind, disabled: !hasDocument }
      ]
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom In', icon: <ZoomIn className="h-4 w-4" />, shortcut: 'Ctrl++', action: onZoomIn, disabled: !hasDocument },
        { label: 'Zoom Out', icon: <ZoomOut className="h-4 w-4" />, shortcut: 'Ctrl+-', action: onZoomOut, disabled: !hasDocument },
        { separator: true },
        { label: 'Fit to Page', icon: <Eye className="h-4 w-4" />, shortcut: 'Ctrl+0', action: onFitToPage, disabled: !hasDocument },
        { label: 'Fit to Width', action: onFitToWidth, disabled: !hasDocument },
        { label: 'Actual Size', shortcut: 'Ctrl+1', action: onActualSize, disabled: !hasDocument },
        { separator: true },
        { label: sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar', icon: <PanelLeft className="h-4 w-4" />, shortcut: 'Ctrl+Shift+S', action: onToggleSidebar },
        { separator: true },
        { label: 'Full Screen', icon: <Maximize2 className="h-4 w-4" />, shortcut: 'F11', action: onFullScreen }
      ]
    },
    {
      label: 'Tools',
      items: [
        { label: 'Merge PDFs', disabled: !hasDocument },
        { label: 'Split PDF', disabled: !hasDocument },
        { label: 'Delete Pages', disabled: !hasDocument },
        { label: 'Reorder Pages', disabled: !hasDocument },
        { separator: true },
        { label: 'Add Text', disabled: !hasDocument },
        { label: 'Highlight Text', disabled: !hasDocument },
        { label: 'Annotate', disabled: !hasDocument },
        { separator: true },
        { label: 'Draw', disabled: !hasDocument },
        { label: 'Shapes', disabled: !hasDocument },
        { separator: true },
        { label: 'Convert to Images', disabled: !hasDocument }
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', shortcut: 'F1' },
        { label: 'About' }
      ]
    }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenu && !menuRefs.current[activeMenu]?.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [activeMenu]);

  const handleMenuClick = (menuLabel: string) => {
    setActiveMenu(activeMenu === menuLabel ? null : menuLabel);
  };

  return (
    <div className="h-8 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between text-[#cccccc] text-[13px] select-none">
      {/* Menu Items */}
      <div className="flex items-center">
        {menus.map((menu) => (
        <div key={menu.label} className="relative" ref={(el) => (menuRefs.current[menu.label] = el)}>
          <button
            onClick={() => handleMenuClick(menu.label)}
            className={cn(
              "px-3 h-8 hover:bg-[#2a2d2e] transition-colors",
              activeMenu === menu.label && "bg-[#2a2d2e]"
            )}
          >
            {menu.label}
            {menu.label === 'File' && hasUnsavedChanges && (
              <span className="ml-1.5 text-[#007acc]" title="Unsaved changes">●</span>
            )}
          </button>
          
          {activeMenu === menu.label && (
            <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-[#3e3e42] shadow-lg min-w-[200px] z-50 py-1">
              {menu.items.map((item, index) => {
                if (item.separator) {
                  return <div key={index} className="h-px bg-[#3e3e42] my-1" />;
                }
                if (!item.label) return null;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      item.action?.();
                      setActiveMenu(null);
                    }}
                    disabled={item.disabled}
                    className={cn(
                      "w-full px-4 py-1.5 text-left text-[13px] flex items-center gap-3 hover:bg-[#2a2d2e] transition-colors",
                      item.disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {item.icon && <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>}
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-[11px] text-[#858585] ml-auto">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        ))}
      </div>

      {/* All Tools Link - Right Side */}
      <Link
        to="/tools"
        className="px-3 h-8 hover:bg-[#2a2d2e] transition-colors flex items-center gap-2 border-l border-[#3e3e42]"
        title="View All Tools"
      >
        <Grid3x3 className="h-4 w-4" />
        <span>All Tools</span>
      </Link>
    </div>
  );
};

export default PdfMenuBar;

