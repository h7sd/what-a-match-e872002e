import { useRef, useEffect } from 'react';

interface VideoBackgroundProps {
  videoUrl: string;
  fallbackColor?: string;
}

export function VideoBackground({ videoUrl, fallbackColor = '#0a0a0a' }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay failed, that's okay
      });
    }
  }, [videoUrl]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ backgroundColor: fallbackColor }}>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
    </div>
  );
}
