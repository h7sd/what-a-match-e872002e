import { useEffect, useRef, useState, useCallback } from 'react';

interface BackgroundEffectsProps {
  backgroundUrl?: string | null;
  backgroundVideoUrl?: string | null;
  backgroundColor?: string | null;
  accentColor?: string | null;
  enableAudio?: boolean;
  audioVolume?: number;
  effectType?: 'none' | 'particles' | 'matrix' | 'stars' | 'snow' | 'fireflies' | 'rain' | 'aurora' | 'bubbles' | 'confetti' | 'geometric' | 'hearts' | 'leaves' | 'smoke' | 'lightning' | 'ripples' | 'hexagons' | 'dna' | 'binary' | 'sakura' | 'music' | 'plasma' | 'cyber';
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
      let count = Math.floor((canvas.width * canvas.height) / 15000);
      
      // Adjust count based on effect type
      if (effectType === 'fireflies') count = Math.min(count, 50);
      if (effectType === 'rain') count = count * 2;
      if (effectType === 'bubbles') count = Math.min(count, 30);
      if (effectType === 'confetti') count = Math.min(count, 100);
      if (effectType === 'geometric') count = Math.min(count, 20);
      if (effectType === 'hearts') count = Math.min(count, 25);
      if (effectType === 'leaves') count = Math.min(count, 30);
      if (effectType === 'smoke') count = Math.min(count, 15);
      if (effectType === 'lightning') count = Math.min(count, 5);
      if (effectType === 'ripples') count = Math.min(count, 8);
      if (effectType === 'hexagons') count = Math.min(count, 15);
      if (effectType === 'dna') count = Math.min(count, 40);
      if (effectType === 'binary') count = Math.min(count, 50);
      if (effectType === 'sakura') count = Math.min(count, 40);
      if (effectType === 'music') count = Math.min(count, 20);
      if (effectType === 'plasma') count = Math.min(count, 30);
      if (effectType === 'cyber') count = Math.min(count, 25);
      
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
        
        if (effectType === 'rain') {
          particle.vy = Math.random() * 8 + 5;
          particle.vx = Math.random() * 0.5;
          particle.opacity = Math.random() * 0.3 + 0.1;
        }
        
        if (effectType === 'fireflies') {
          particle.radius = Math.random() * 3 + 2;
          particle.vx = (Math.random() - 0.5) * 0.8;
          particle.vy = (Math.random() - 0.5) * 0.8;
        }
        
        if (effectType === 'bubbles') {
          particle.radius = Math.random() * 20 + 5;
          particle.vy = -(Math.random() * 0.5 + 0.2);
          particle.y = canvas.height + particle.radius;
        }
        
        if (effectType === 'confetti') {
          particle.radius = Math.random() * 4 + 2;
          particle.vy = Math.random() * 2 + 1;
          particle.vx = (Math.random() - 0.5) * 2;
        }
        
        if (effectType === 'geometric') {
          particle.radius = Math.random() * 30 + 20;
          particle.vx = (Math.random() - 0.5) * 0.3;
          particle.vy = (Math.random() - 0.5) * 0.3;
        }
        
        if (effectType === 'hearts' || effectType === 'sakura' || effectType === 'leaves' || effectType === 'music') {
          particle.vy = Math.random() * 1 + 0.5;
          particle.vx = (Math.random() - 0.5) * 0.8;
          particle.radius = Math.random() * 3 + 2;
        }
        
        if (effectType === 'smoke') {
          particle.radius = Math.random() * 30 + 20;
          particle.vy = -(Math.random() * 0.3 + 0.1);
          particle.y = canvas.height + particle.radius;
        }
        
        if (effectType === 'binary') {
          particle.char = Math.random() > 0.5 ? '1' : '0';
          particle.vy = Math.random() * 2 + 1;
        }
        
        if (effectType === 'hexagons' || effectType === 'cyber') {
          particle.radius = Math.random() * 40 + 30;
          particle.vx = (Math.random() - 0.5) * 0.2;
          particle.vy = (Math.random() - 0.5) * 0.2;
        }
        
        if (effectType === 'plasma') {
          particle.radius = Math.random() * 50 + 30;
        }

        particles.push(particle);
      }
    };

    let time = 0;

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.02;

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around or reset
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) {
          if (effectType === 'rain') {
            particle.y = -10;
            particle.x = Math.random() * canvas.width;
          } else if (effectType === 'bubbles') {
            particle.y = canvas.height + particle.radius;
            particle.x = Math.random() * canvas.width;
          } else {
            particle.y = 0;
          }
        }

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
        } else if (effectType === 'rain') {
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(particle.x + particle.vx * 2, particle.y + 15);
          ctx.strokeStyle = `rgba(150, 180, 255, ${particle.opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (effectType === 'fireflies') {
          const pulse = Math.sin(time * 2 + index) * 0.5 + 0.5;
          const glow = particle.radius * (1 + pulse * 0.5);
          const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, glow * 3);
          gradient.addColorStop(0, `rgba(255, 255, 150, ${0.8 * pulse})`);
          gradient.addColorStop(0.5, `rgba(255, 200, 100, ${0.3 * pulse})`);
          gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, glow * 3, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        } else if (effectType === 'aurora') {
          // Aurora is drawn as waves
          const waveHeight = 100;
          const y = canvas.height * 0.3 + Math.sin(time + particle.x * 0.01) * waveHeight;
          ctx.beginPath();
          ctx.arc(particle.x, y, particle.radius * 3, 0, Math.PI * 2);
          const auroraColors = ['rgba(0, 255, 100, 0.1)', 'rgba(0, 200, 255, 0.1)', 'rgba(100, 0, 255, 0.1)'];
          ctx.fillStyle = auroraColors[index % 3];
          ctx.fill();
        } else if (effectType === 'bubbles') {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity * 0.5})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          // Highlight
          ctx.beginPath();
          ctx.arc(particle.x - particle.radius * 0.3, particle.y - particle.radius * 0.3, particle.radius * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity * 0.5})`;
          ctx.fill();
        } else if (effectType === 'confetti') {
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(time + index);
          const confettiColors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bcb', '#c56bff'];
          ctx.fillStyle = confettiColors[index % confettiColors.length];
          ctx.fillRect(-particle.radius, -particle.radius * 0.5, particle.radius * 2, particle.radius);
          ctx.restore();
        } else if (effectType === 'geometric') {
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(time * 0.5 + index);
          ctx.beginPath();
          const sides = 3 + (index % 4);
          for (let j = 0; j < sides; j++) {
            const angle = (j / sides) * Math.PI * 2;
            const x = Math.cos(angle) * particle.radius;
            const y = Math.sin(angle) * particle.radius;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity * 0.3})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        } else if (effectType === 'hearts') {
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(Math.sin(time + index) * 0.1);
          ctx.font = `${12 + particle.radius * 3}px Arial`;
          ctx.fillStyle = `rgba(255, 100, 150, ${particle.opacity})`;
          ctx.fillText('❤', -8, 8);
          ctx.restore();
        } else if (effectType === 'leaves') {
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(time * 0.5 + index);
          const leafColors = ['#22c55e', '#84cc16', '#f97316', '#eab308', '#dc2626'];
          ctx.font = `${14 + particle.radius * 2}px Arial`;
          ctx.fillStyle = leafColors[index % leafColors.length];
          ctx.fillText('🍂', -8, 8);
          ctx.restore();
        } else if (effectType === 'smoke') {
          const pulse = Math.sin(time + index) * 0.3 + 0.7;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(150, 150, 150, ${particle.opacity * 0.15})`;
          ctx.fill();
        } else if (effectType === 'lightning') {
          if (Math.random() > 0.995) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        } else if (effectType === 'ripples') {
          const rippleSize = ((time * 50 + index * 80) % 400);
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, rippleSize, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.3 * (1 - rippleSize / 400)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (effectType === 'hexagons') {
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(time * 0.2);
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const angle = (j / 6) * Math.PI * 2;
            const x = Math.cos(angle) * particle.radius;
            const y = Math.sin(angle) * particle.radius;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(0, 255, 255, ${particle.opacity * 0.3})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        } else if (effectType === 'dna') {
          const wave = Math.sin(time * 2 + particle.y * 0.02) * 50;
          const x1 = canvas.width / 2 + wave;
          const x2 = canvas.width / 2 - wave;
          ctx.beginPath();
          ctx.arc(x1, particle.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(59, 130, 246, ${particle.opacity})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x2, particle.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(139, 92, 246, ${particle.opacity})`;
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x1, particle.y);
          ctx.lineTo(x2, particle.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${particle.opacity * 0.3})`;
          ctx.stroke();
        } else if (effectType === 'binary') {
          ctx.font = '12px monospace';
          ctx.fillStyle = `rgba(0, 255, 255, ${particle.opacity * 0.7})`;
          ctx.fillText(particle.char || '0', particle.x, particle.y);
        } else if (effectType === 'sakura') {
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(time + index);
          ctx.font = `${10 + particle.radius * 2}px Arial`;
          ctx.fillStyle = `rgba(255, 183, 197, ${particle.opacity})`;
          ctx.fillText('🌸', -8, 8);
          ctx.restore();
        } else if (effectType === 'music') {
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(Math.sin(time * 2 + index) * 0.3);
          const notes = ['♪', '♫', '♬', '♩'];
          ctx.font = `${14 + particle.radius * 2}px Arial`;
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity})`;
          ctx.fillText(notes[index % notes.length], -8, 8);
          ctx.restore();
        } else if (effectType === 'plasma') {
          const hue = (time * 50 + particle.x * 0.5 + particle.y * 0.5) % 360;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius * (1 + Math.sin(time * 2) * 0.3), 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${particle.opacity * 0.2})`;
          ctx.fill();
        } else if (effectType === 'cyber') {
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.strokeStyle = `rgba(0, 255, 255, ${particle.opacity * 0.4})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(-particle.radius / 2, -particle.radius / 2, particle.radius, particle.radius);
          // Add scan line
          const scanY = (time * 100 + index * 20) % particle.radius - particle.radius / 2;
          ctx.beginPath();
          ctx.moveTo(-particle.radius / 2, scanY);
          ctx.lineTo(particle.radius / 2, scanY);
          ctx.strokeStyle = `rgba(0, 255, 255, 0.8)`;
          ctx.stroke();
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

      // Draw connections for particles (not for matrix/snow/rain/etc)
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
            // Prevent quality degradation
            filter: 'none',
            WebkitFilter: 'none',
          } as React.CSSProperties}
        >
          <source src={backgroundVideoUrl} type="video/mp4; codecs=hvc1" />
          <source src={backgroundVideoUrl} type="video/mp4; codecs=avc1" />
          <source src={backgroundVideoUrl} type="video/mp4" />
          <source src={backgroundVideoUrl} type="video/quicktime" />
          <source src={backgroundVideoUrl} type="video/webm; codecs=vp9" />
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
