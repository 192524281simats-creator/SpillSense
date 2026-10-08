import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Waves, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl gradient-aqua flex items-center justify-center mx-auto mb-6">
          <Waves className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-6xl font-black text-muted-foreground mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">This route doesn't exist in SpillSense. Navigate using the sidebar or return to the dashboard.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-aqua text-white font-semibold hover:opacity-90 transition-opacity">
            Go to Dashboard
          </Link>
          <Link to="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" /> Landing
          </Link>
        </div>
      </div>
    </div>
  );
}
