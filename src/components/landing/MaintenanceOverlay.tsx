import { ExternalLink } from "lucide-react";
import { FaDiscord } from "react-icons/fa";
import FuzzyTextEffect from "@/components/profile/FuzzyTextEffect";
import { LiquidChrome } from "@/components/ui/LiquidChrome";
import GSAPSplitText from "@/components/ui/GSAPSplitText";

const MaintenanceOverlay = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      {/* Liquid Chrome Background - Red/Black */}
      <div className="absolute inset-0 z-0">
        <LiquidChrome
          baseColor={[0.3, 0.0, 0.0]}
          speed={0.3}
          amplitude={0.5}
          frequencyX={3}
          frequencyY={2}
          interactive={true}
        />
      </div>
      
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40 z-[1]" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-2xl w-full">
        {/* 503 - Mobile-safe fallback + Desktop fuzzy */}
        <div className="mb-10 flex justify-center items-center w-full">
          {/* Mobile: plain text (canvas effects can be unreliable on some devices) */}
          <div className="sm:hidden select-none leading-none font-black tracking-[0.18em] text-[clamp(3.5rem,18vw,6rem)] bg-gradient-to-r from-destructive to-background bg-clip-text text-transparent">
            503
          </div>

          {/* Desktop+: fuzzy canvas */}
          <div className="hidden sm:block">
            <FuzzyTextEffect
              fontSize="clamp(4rem, 12vw, 8rem)"
              fontWeight={900}
              fontFamily="monospace"
              gradient={["hsl(var(--destructive))", "hsl(var(--background))"]}
              glitchMode={true}
              glitchInterval={2500}
              glitchDuration={400}
              baseIntensity={0.2}
              hoverIntensity={0.5}
              letterSpacing={12}
              className="max-w-full"
            >
              503
            </FuzzyTextEffect>
          </div>
        </div>

        {/* Title - Centered */}
        <div className="mb-8 w-full flex justify-center">
          <GSAPSplitText
            text="Database Maintenance in Progress"
            className="text-2xl md:text-3xl font-semibold text-white tracking-tight"
            delay={40}
            duration={1}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 30 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="0px"
            textAlign="center"
            tag="h1"
          />
        </div>
        
        {/* Messages - Centered */}
        <div className="space-y-4 mb-10 w-full flex flex-col items-center">
          <GSAPSplitText
            text="We are currently restructuring and optimizing our database infrastructure."
            className="text-base md:text-lg text-white/70 font-light leading-relaxed max-w-xl"
            delay={25}
            duration={0.8}
            ease="power2.out"
            splitType="words"
            from={{ opacity: 0, y: 20 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="0px"
            textAlign="center"
            tag="p"
          />
          
          <GSAPSplitText
            text="During this time, some features may be temporarily unavailable or experience minor delays."
            className="text-sm md:text-base text-white/50 font-light leading-relaxed max-w-xl"
            delay={20}
            duration={0.7}
            ease="power2.out"
            splitType="words"
            from={{ opacity: 0, y: 15 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="0px"
            textAlign="center"
            tag="p"
          />
          
          <GSAPSplitText
            text="We appreciate your patience. Normal service will resume shortly."
            className="text-sm md:text-base text-white/50 font-light leading-relaxed max-w-xl"
            delay={20}
            duration={0.7}
            ease="power2.out"
            splitType="words"
            from={{ opacity: 0, y: 15 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="0px"
            textAlign="center"
            tag="p"
          />
        </div>
        
        {/* Divider */}
        <div className="w-20 h-px bg-white/20 mb-8" />
        
        {/* Buttons - Centered */}
        <div className="flex gap-8 justify-center mb-10">
          <a 
            href="https://status.uservault.cc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors duration-300"
          >
            <ExternalLink className="w-4 h-4" />
            Status
          </a>
          
          <a 
            href="https://discord.com/channels/1464309088736252097/1464321025532629150" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors duration-300"
          >
            <FaDiscord className="w-4 h-4" />
            Discord
          </a>
        </div>
        
        {/* Team signature - Centered */}
        <GSAPSplitText
          text="UserVault Team"
          className="text-xs text-white/30 font-light tracking-[0.3em] uppercase"
          delay={30}
          duration={0.6}
          ease="power2.out"
          splitType="chars"
          from={{ opacity: 0, y: 10 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="0px"
          textAlign="center"
          tag="p"
        />
      </div>
    </div>
  );
};

export default MaintenanceOverlay;
