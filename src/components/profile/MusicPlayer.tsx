import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface MusicPlayerProps {
  url: string;
  accentColor?: string;
}

export function MusicPlayer({ url, accentColor = '#8b5cf6' }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const [frequencies, setFrequencies] = useState<number[]>(Array(12).fill(0));

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setFrequencies(
          Array(12)
            .fill(0)
            .map(() => Math.random() * 100)
        );
      }, 100);
    } else {
      setFrequencies(Array(12).fill(0));
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-4 w-full max-w-sm"
    >
      <audio ref={audioRef} src={url} loop />

      <div className="flex items-center gap-4">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
          style={{ backgroundColor: accentColor }}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </button>

        {/* Frequency bars */}
        <div className="flex items-end gap-0.5 h-8 flex-1">
          {frequencies.map((freq, i) => (
            <motion.div
              key={i}
              className="w-1.5 rounded-full"
              style={{ backgroundColor: accentColor }}
              animate={{ height: `${Math.max(4, freq * 0.3)}px` }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={([v]) => {
              setVolume(v / 100);
              setIsMuted(false);
            }}
            max={100}
            step={1}
            className="w-16"
          />
        </div>
      </div>
    </motion.div>
  );
}
