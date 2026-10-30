import { toast } from 'sonner';

export const copyToClipboard = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    toast.error('Unable to copy automatically. Please copy manually.');
    return false;
  }
};

export const copyWithToast = async (value: string, message = `Copied ${value}`) => {
  if (await copyToClipboard(value)) toast.success(message);
};
