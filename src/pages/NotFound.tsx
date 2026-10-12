import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { SEO } from "@/components/SEO";

const NotFound = () => (
  <div className="min-h-[60vh] flex items-center justify-center text-white">
    <SEO title="Page not found" description="The page you are looking for does not exist." noIndex />
    <div className="text-center">
      <SearchX className="h-12 w-12 mx-auto mb-4 text-sky-400" aria-hidden="true" />
      <h1 className="text-4xl font-bold mb-3">404</h1>
      <p className="text-lg text-slate-400 mb-6">Oops! Page not found</p>
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link to="/tools" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
          Browse all tools
        </Link>
        <Link to="/" className="text-slate-300 hover:text-white underline underline-offset-2">
          Return to Home
        </Link>
      </div>
    </div>
  </div>
);

export default NotFound;
