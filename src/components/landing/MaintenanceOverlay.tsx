import { ExternalLink } from "lucide-react";
import { FaDiscord } from "react-icons/fa";
import FuzzyTextEffect from "@/components/profile/FuzzyTextEffect";
import { SplitText } from "@/components/landing/SplitText";

const MaintenanceOverlay = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Content */}
      <div className="relative z-10 max-w-2xl text-center">
        {/* Fuzzy 503 */}
        <div className="mb-8 flex justify-center">
          <FuzzyTextEffect
            fontSize="clamp(3rem, 10vw, 6rem)"
            fontWeight={700}
            fontFamily="monospace"
            color="#ffffff"
            glitchMode={true}
            glitchInterval={3000}
            glitchDuration={300}
            baseIntensity={0.15}
            hoverIntensity={0.4}
          >
            503
          </FuzzyTextEffect>
        </div>

        {/* Title */}
        <div className="mb-8">
          <SplitText
            text="Database Maintenance in Progress"
            className="text-xl md:text-2xl font-medium text-white/90 tracking-tight"
            delay={30}
            animationFrom={{ opacity: 0, transform: 'translate3d(0,20px,0)' }}
            animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
            threshold={0.1}
            rootMargin="0px"
            textAlign="center"
          />
        </div>
        
        {/* Message */}
        <div className="space-y-4 mb-10">
          <SplitText
            text="We are currently restructuring and optimizing our database infrastructure."
            className="text-base md:text-lg text-white/60 font-light leading-relaxed"
            delay={20}
            animationFrom={{ opacity: 0, transform: 'translate3d(0,10px,0)' }}
            animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
            threshold={0.1}
            rootMargin="0px"
            textAlign="center"
          />
          
          <SplitText
            text="During this time, some features may be temporarily unavailable or experience minor delays."
            className="text-sm md:text-base text-white/40 font-light leading-relaxed"
            delay={15}
            animationFrom={{ opacity: 0, transform: 'translate3d(0,10px,0)' }}
            animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
            threshold={0.1}
            rootMargin="0px"
            textAlign="center"
          />
          
          <SplitText
            text="We appreciate your patience. Normal service will resume shortly."
            className="text-sm md:text-base text-white/40 font-light leading-relaxed"
            delay={15}
            animationFrom={{ opacity: 0, transform: 'translate3d(0,10px,0)' }}
            animationTo={{ opacity: 1, transform: 'translate3d(0,0,0)' }}
            threshold={0.1}
            rootMargin="0px"
            textAlign="center"
          />
        </div>
        
        {/* Divider */}
        <div className="w-16 h-px bg-white/10 mx-auto mb-8" />
        
        {/* Buttons */}
        <div className="flex gap-6 justify-center mb-10">
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
        <p className="text-xs text-white/20 font-light tracking-widest uppercase">
          UserVault Team
        </p>
      </div>
    </div>
  );
};

export default MaintenanceOverlay;
