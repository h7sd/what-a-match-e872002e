import { useEffect, useRef, useState, useCallback } from 'react';

interface BackgroundEffectsProps {
  backgroundUrl?: string | null;
  backgroundVideoUrl?: string | null;
  backgroundColor?: string | null;
  accentColor?: string | null;
  enableAudio?: boolean;
  audioVolume?: number;
  effectType?: 'none' | 'particles' | 'matrix' | 'stars' | 'snow';
}

export function BackgroundEffects({
  backgroundUrl,
  backgroundVideoUrl,
  backgroundColor = '#0a0a0a',
  accentColor = '#8b5cf6',
  enableAudio = true,
  audioVolume = 0.3,
  effectType = 'particles',
}: BackgroundEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const animationRef = useRef<number>(0);

  // Handle user interaction to enable audio
  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      if (videoRef.current && enableAudio) {
        videoRef.current.muted = false;
        videoRef.current.volume = audioVolume;
      }
    };

    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [enableAudio, audioVolume]);

  // Update volume when it changes
  useEffect(() => {
    if (videoRef.current && hasInteracted && enableAudio) {
      videoRef.current.volume = audioVolume;
    }
  }, [audioVolume, hasInteracted, enableAudio]);

  // Optimize video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !backgroundVideoUrl) return;

    // Force hardware acceleration and smooth playback
    video.style.willChange = 'transform';
    
    const handleCanPlay = () => {
      video.play().catch(() => {});
    };

    video.addEventListener('canplay', handleCanPlay);
    
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [backgroundVideoUrl]);

  const hexToRgb = useCallback((hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 139, g: 92, b: 246 };
  }, []);

  useEffect(() => {
    if (effectType === 'none') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      opacity: number;
      char?: string;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const color = hexToRgb(accentColor || '#8b5cf6');

    const createParticles = () => {
      particles.length = 0;
      const count = Math.floor((canvas.width * canvas.height) / 15000);
      
      for (let i = 0; i < count; i++) {
        const particle: typeof particles[0] = {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 0.5,
          vx: (Math.random() - 0.5) * 0.4,
          vy: effectType === 'snow' ? Math.random() * 0.5 + 0.3 : (Math.random() - 0.5) * 0.4,
          opacity: Math.random() * 0.6 + 0.2,
        };

        if (effectType === 'matrix') {
          particle.char = String.fromCharCode(0x30A0 + Math.random() * 96);
          particle.vy = Math.random() * 2 + 1;
        }

        particles.push(particle);
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        if (effectType === 'matrix' && particle.char) {
          ctx.font = '14px monospace';
          ctx.fillStyle = `rgba(0, ${180 + Math.random() * 75}, 0, ${particle.opacity})`;
          ctx.fillText(particle.char, particle.x, particle.y);
          if (Math.random() > 0.98) {
            particle.char = String.fromCharCode(0x30A0 + Math.random() * 96);
          }
        } else if (effectType === 'stars') {
          const starSize = particle.radius * 2;
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            ctx.lineTo(0, -starSize);
            ctx.rotate(Math.PI / 5);
            ctx.lineTo(0, -starSize / 2);
            ctx.rotate(Math.PI / 5);
          }
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity})`;
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fillStyle = effectType === 'snow' 
            ? `rgba(255, 255, 255, ${particle.opacity})`
            : `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity})`;
          ctx.fill();
        }
      });

      // Draw connections for particles (not for matrix/snow)
      if (effectType === 'particles') {
        particles.forEach((p1, i) => {
          particles.slice(i + 1).forEach((p2) => {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 120) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.15 * (1 - dist / 120)})`;
              ctx.stroke();
            }
          });
        });
      }

      animationRef.current = requestAnimationFrame(drawParticles);
    };

    resize();
    createParticles();
    drawParticles();

    const handleResize = () => {
      resize();
      createParticles();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [accentColor, effectType, hexToRgb]);

  return (
    <div className="fixed inset-0 -z-10">
      {/* Video background with optimized 60fps playback */}
      {backgroundVideoUrl && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted={!hasInteracted || !enableAudio}
          playsInline
          preload="auto"
          disablePictureInPicture
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            perspective: 1000,
            WebkitPerspective: 1000,
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
          }}
        >
          <source src={backgroundVideoUrl} type="video/mp4" />
          <source src={backgroundVideoUrl} type="video/quicktime" />
          <source src={backgroundVideoUrl} type="video/x-m4v" />
        </video>
      )}

      {/* Image background */}
      {!backgroundVideoUrl && backgroundUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
      )}

      {/* Color background */}
      {!backgroundVideoUrl && !backgroundUrl && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: backgroundColor || '#0a0a0a' }}
        />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accentColor}30, transparent 60%)`,
        }}
      />

      {/* Particle canvas */}
      {effectType !== 'none' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 opacity-70 pointer-events-none"
        />
      )}

      {/* Noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
