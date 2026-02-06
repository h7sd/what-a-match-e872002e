import { ExternalLink } from "lucide-react";
import { FaDiscord } from "react-icons/fa";

const MaintenanceOverlay = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
      
      {/* Content */}
      <div className="relative z-10 max-w-lg text-center">
        {/* Minimal indicator */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm text-white/60 font-medium tracking-wide">Maintenance</span>
        </div>
        
        {/* Message */}
        <p className="text-xl md:text-2xl text-white/90 font-light leading-relaxed mb-4">
          We are currently restructuring and optimizing our database infrastructure.
        </p>
        <p className="text-base text-white/50 font-light leading-relaxed mb-10">
          Some features may be temporarily unavailable. Normal service will resume shortly.
        </p>
        
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a 
            href="https://status.uservault.cc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Status Page
          </a>
          
          <a 
            href="https://discord.com/channels/1464309088736252097/1464321025532629150" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors border border-white/10"
          >
            <FaDiscord className="w-4 h-4" />
            Discord
          </a>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceOverlay;
