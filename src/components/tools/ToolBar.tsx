import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EXTERNAL_URLS } from '@/config/externalUrls';
import { getAvailableTools } from '@/config/toolsData';

const TOOLS = getAvailableTools().filter((tool) => tool.path);

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
          <SelectTrigger className="h-8 w-44 border-white/25 bg-white/[0.08] text-xs text-white" aria-label="Switch tool">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOOLS.map(({ icon: Icon, iconImage, path, title: toolTitle }) => (
              <SelectItem key={path} value={path ?? ''}>
                <span className="flex items-center gap-2">
                  {iconImage ? (
                    <img src={iconImage} alt="" aria-hidden="true" className="h-4 w-4 shrink-0 object-contain" />
                  ) : (
                    <Icon className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
                  )}
                  <span className="truncate">{toolTitle}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </nav>
  );
};

export default ToolBar;
