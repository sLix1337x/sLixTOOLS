import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EXTERNAL_URLS } from '@/config/externalUrls';
import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_ORDER, getAvailableTools } from '@/config/toolsData';

const TOOLS = getAvailableTools().filter((tool) => tool.path);
/** Tool menu sections, in the order of the tools page */
const GROUPS = CATEGORY_ORDER.map((category) => ({
  category,
  tools: TOOLS.filter((tool) => tool.category === category),
})).filter((group) => group.tools.length > 0);

export const ToolbarDivider = () => <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/15" />;

/** Slim top bar of full-width tool pages, in place of the site header. */
const ToolBar = ({ title }: { title: string }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav aria-label="Tool navigation" className="flex h-12 items-center gap-3 border-b border-white/10 px-4">
      <Link to="/" className="shrink-0">
        <img src={EXTERNAL_URLS.DEMO_IMAGES.LOGO} alt="sLixTOOLS home" className="h-6 w-auto" />
      </Link>
      <span className="truncate text-sm font-bold text-white">{title}</span>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Link
          to="/tools"
          className="hidden items-center gap-1.5 text-xs text-slate-300 transition-colors hover:text-white sm:inline-flex"
        >
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
          All tools
        </Link>
        <Select value={pathname} onValueChange={(path) => navigate(path)}>
          <SelectTrigger
            className="h-8 w-48 rounded-lg border-white/15 bg-white/[0.06] text-xs text-white transition-colors hover:border-sky-400/50 focus:ring-1 focus:ring-sky-400/60 focus:ring-offset-0 data-[state=open]:border-sky-400/60"
            aria-label="Switch tool"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            align="end"
            className="max-h-[min(44rem,var(--radix-select-content-available-height))] w-64 rounded-xl border-white/10 bg-[#121214]/95 text-slate-200 shadow-2xl shadow-black/60 backdrop-blur"
          >
            {GROUPS.map(({ category, tools }, i) => {
              const CatIcon = CATEGORY_ICONS[category];
              return (
                <SelectGroup key={category}>
                  {i > 0 && <SelectSeparator className="mx-1 bg-white/[0.06]" />}
                  <SelectLabel className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <CatIcon className="h-3 w-3" aria-hidden="true" />
                    {CATEGORY_LABELS[category]}
                  </SelectLabel>
                  {tools.map(({ icon: Icon, iconImage, path, title: toolTitle }) => (
                    // The selected tool is tinted instead of check-marked, so the check column is hidden
                    <SelectItem
                      key={path}
                      value={path ?? ''}
                      className="cursor-pointer rounded-md py-1 pl-2 text-[13px] text-slate-300 transition-colors focus:bg-white/[0.07] focus:text-white data-[state=checked]:bg-sky-400/10 data-[state=checked]:text-sky-300 [&>span:first-child]:hidden"
                    >
                      <span className="flex items-center gap-2.5">
                        {iconImage ? (
                          <img src={iconImage} alt="" aria-hidden="true" className="h-4 w-4 shrink-0 object-contain" />
                        ) : (
                          <Icon className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
                        )}
                        <span className="truncate">{toolTitle}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </nav>
  );
};

export default ToolBar;
