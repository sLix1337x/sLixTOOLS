import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { handOff } from '@/utils/handoff';
import { chipButton } from '@/styles/constants';

export interface SendTarget {
  label: string;
  path: string;
}

interface SendToButtonsProps {
  /** Built lazily so the File is only created on click. */
  getFile: () => File | null;
  targets: SendTarget[];
  disabled?: boolean;
}

/** Chip buttons that open the current result in another tool. */
const SendToButtons = ({ getFile, targets, disabled = false }: SendToButtonsProps) => {
  const navigate = useNavigate();
  return (
    <>
      {targets.map(({ label, path }) => (
        <button
          key={path}
          type="button"
          disabled={disabled}
          className={chipButton}
          onClick={() => {
            const file = getFile();
            if (!file) return;
            handOff(file);
            navigate(path);
          }}
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </>
  );
};

export default SendToButtons;
