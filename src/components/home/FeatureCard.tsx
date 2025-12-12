import { memo } from 'react';
import AnimatedElement from '@/components/AnimatedElement';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  delay: number;
  decorativeImage?: string;
  decorativeImageAlt?: string;
  isVisible?: boolean;
}

export const FeatureCard = memo<FeatureCardProps>(({
  icon: Icon,
  title,
  description,
  gradientFrom,
  gradientTo,
  delay,
  decorativeImage,
  decorativeImageAlt,
  isVisible = true,
}) => (
  <AnimatedElement type="slideUp" delay={delay} isVisible={isVisible}>
    <div className="relative h-full min-h-[200px] flex flex-col">
      {decorativeImage && (
        <img
          src={decorativeImage}
          alt={decorativeImageAlt || ''}
          className="absolute -top-16 -right-8 w-32 h-32 z-10"
        />
      )}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-transparent hover:border-green-500/50 transition-all duration-300 group flex-1 flex flex-col">
        <div className="text-center flex-1 flex flex-col justify-center">
          <div className={cn("w-12 h-12 bg-gradient-to-br rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300", gradientFrom, gradientTo)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white mb-0 h-8 text-center leading-8 -mt-2">
            {title}
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed mt-1">
            {description}
          </p>
        </div>
      </div>
    </div>
  </AnimatedElement>
));

FeatureCard.displayName = 'FeatureCard';

export default FeatureCard;
