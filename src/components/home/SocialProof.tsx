import { Zap, Lock, CircleDollarSign, Shield, type LucideIcon } from 'lucide-react';

const PROOF_ITEMS: { icon: LucideIcon; label: string; color: string }[] = [
  { icon: Zap, label: 'Lightning Fast', color: 'text-green-400' },
  { icon: Lock, label: '100% Private Processing', color: 'text-blue-400' },
  { icon: CircleDollarSign, label: 'Always Free', color: 'text-pink-400' },
  { icon: Shield, label: 'Secure', color: 'text-blue-400' },
];

const Divider = () => <div className="hidden sm:block w-px h-4 bg-green-400 mx-4" />;

export const SocialProof = () => (
  <div className="social-proof flex flex-col sm:flex-row items-center justify-center opacity-100">
    {PROOF_ITEMS.map((item, index) => (
      <div key={item.label} className="contents">
        <div className={`flex items-center gap-2 ${item.color} font-semibold`}>
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </div>
        {index < PROOF_ITEMS.length - 1 && <Divider />}
      </div>
    ))}
  </div>
);

export default SocialProof;
