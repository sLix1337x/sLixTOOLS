import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PdfConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const PdfConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel
}: PdfConfirmDialogProps) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'text-red-500',
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      icon: 'text-yellow-500',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      icon: 'text-blue-500',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[#252526] border border-[#3e3e42] rounded-lg p-6 min-w-[400px] max-w-[500px] shadow-xl">
        <div className="flex items-start gap-4">
          <div className={cn("flex-shrink-0", styles.icon)}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#cccccc] mb-2">{title}</h3>
            <p className="text-sm text-[#858585] mb-6">{message}</p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={onCancel}
                className="text-sm"
              >
                {cancelText}
              </Button>
              <Button
                onClick={onConfirm}
                className={cn("text-sm", styles.confirmButton)}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfConfirmDialog;

