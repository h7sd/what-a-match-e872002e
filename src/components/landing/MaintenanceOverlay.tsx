import { ExternalLink } from "lucide-react";
import { FaDiscord } from "react-icons/fa";
import FuzzyTextEffect from "@/components/profile/FuzzyTextEffect";

const MaintenanceOverlay = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Content */}
      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Fuzzy 503 with extra padding to prevent cutoff */}
        <div className="mb-6 flex justify-center w-full px-8">
          <div className="w-full max-w-xs">
            <FuzzyTextEffect
              fontSize="clamp(2.5rem, 8vw, 5rem)"
              fontWeight={700}
              fontFamily="monospace"
              color="#ffffff"
              glitchMode={true}
              glitchInterval={3000}
              glitchDuration={300}
              baseIntensity={0.15}
              hoverIntensity={0.4}
              letterSpacing={8}
            >
              503
            </FuzzyTextEffect>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-medium text-white/90 tracking-tight mb-6 animate-fade-in">
          Database Maintenance in Progress
        </h1>
        
        {/* Message */}
        <div className="space-y-3 mb-10">
          <p className="text-base md:text-lg text-white/60 font-light leading-relaxed animate-fade-in" style={{ animationDelay: '0.1s' }}>
            We are currently restructuring and optimizing our database infrastructure.
          </p>
          
          <p className="text-sm md:text-base text-white/40 font-light leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            During this time, some features may be temporarily unavailable or experience minor delays.
          </p>
          
          <p className="text-sm md:text-base text-white/40 font-light leading-relaxed animate-fade-in" style={{ animationDelay: '0.3s' }}>
            We appreciate your patience. Normal service will resume shortly.
          </p>
        </div>
        
        {/* Divider */}
        <div className="w-16 h-px bg-white/10 mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.4s' }} />
        
        {/* Buttons */}
        <div className="flex gap-6 justify-center mb-10 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <a 
            href="https://status.uservault.cc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors duration-300"
          >
            <ExternalLink className="w-4 h-4" />
            Status
          </a>
          
          <a 
            href="https://discord.com/channels/1464309088736252097/1464321025532629150" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors duration-300"
          >
            <FaDiscord className="w-4 h-4" />
            Discord
          </a>
        </div>
        
        {/* Team signature */}
        <p className="text-xs text-white/20 font-light tracking-widest uppercase animate-fade-in" style={{ animationDelay: '0.6s' }}>
          UserVault Team
        </p>
      </div>
    </div>
  );
};

export default MaintenanceOverlay;
