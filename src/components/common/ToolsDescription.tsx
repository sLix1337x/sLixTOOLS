import { CONTENT } from '@/config/content';
import { cn } from '@/lib/utils';

export interface ToolsDescriptionProps {
  className?: string;
  textClassName?: string;
  highlightClassName?: string;
}

export const ToolsDescription = ({
  className,
  textClassName = "text-gray-300 text-base mb-4 leading-relaxed",
  highlightClassName = "text-green-400",
}: ToolsDescriptionProps) => (
  <p className={cn(textClassName, className)}>
    {CONTENT.TOOLS_DESCRIPTION.INTRO}
    <br />
    <span className={highlightClassName}>{CONTENT.TOOLS_DESCRIPTION.PRIVACY}</span> {CONTENT.TOOLS_DESCRIPTION.PRIVACY_SUFFIX}
  </p>
);

export default ToolsDescription;

