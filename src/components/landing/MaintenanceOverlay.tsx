import { ExternalLink } from "lucide-react";
import { FaDiscord } from "react-icons/fa";

const MaintenanceOverlay = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95" />
      
      {/* Content */}
      <div className="relative z-10 max-w-md text-center">
        {/* Pulse dot */}
        <div className="flex justify-center mb-10">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
        </div>
        
        {/* Message */}
        <p className="text-lg text-white/80 font-light leading-relaxed mb-3">
          We're optimizing our infrastructure.
        </p>
        <p className="text-sm text-white/40 font-light mb-12">
          Back shortly.
        </p>
        
        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <a 
            href="https://status.uservault.cc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Status
          </a>
          
          <span className="text-white/20">·</span>
          
          <a 
            href="https://discord.com/channels/1464309088736252097/1464321025532629150" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <FaDiscord className="w-3.5 h-3.5" />
            Discord
          </a>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceOverlay;
