import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { FadeIn } from './FadeIn';

export function ClaimBanner() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleClaim = () => {
    navigate('/auth', { state: { suggestedUsername: username } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && username.trim()) {
      handleClaim();
    }
  };

  return (
    <FadeIn delay={0.2}>
      <section className="py-12">
        <motion.div 
          className="bg-card/60 backdrop-blur-md rounded-2xl border border-border/50 p-6 md:p-8"
          whileHover={{ borderColor: 'hsl(var(--primary) / 0.3)' }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <p className="text-lg md:text-xl text-foreground font-medium">
                Claim your profile and create an account in minutes!
              </p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center bg-background/80 rounded-lg border border-border/50 px-4 py-2.5 flex-1 md:flex-none">
                <span className="text-muted-foreground text-sm whitespace-nowrap">uservault.cc/</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  onKeyDown={handleKeyDown}
                  placeholder="username"
                  className="bg-transparent border-none outline-none text-foreground w-24 md:w-32 text-sm"
                  maxLength={20}
                />
              </div>
              
              <motion.button
                onClick={handleClaim}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm whitespace-nowrap hover:bg-primary/90 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Claim Now
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>
    </FadeIn>
  );
}
