import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShuffleText, FuzzyText, DecryptedText, ASCIIText } from './TextAnimations';
import ASCIITextEffect from './ASCIITextEffect';
import DecryptedTextEffect from './DecryptedTextEffect';
import FuzzyTextEffect from './FuzzyTextEffect';
import ShuffleTextEffect from './ShuffleTextEffect';

interface StartScreenProps {
  onStart: () => void;
  message?: string;
  font?: string;
  textColor?: string;
  bgColor?: string;
  textAnimation?: string;
}

function AnimatedText({ 
  text, 
  animation, 
  font, 
  color 
}: { 
  text: string; 
  animation: string; 
  font: string; 
  color: string;
}) {
  const style = { fontFamily: font, color };
  
  switch (animation) {
    case 'shuffle':
      return <ShuffleText text={text} style={style} className="text-xl" />;
    case 'shuffle-gsap':
      return (
        <ShuffleTextEffect
          text={text}
          style={{ ...style, fontSize: 'clamp(1.25rem, 3vw, 2rem)' }}
          shuffleDirection="right"
          duration={0.35}
          animationMode="evenodd"
          shuffleTimes={1}
          stagger={0.03}
          triggerOnHover={true}
          autoPlay={true}
          loop={false}
        />
      );
    case 'fuzzy':
      return <FuzzyText text={text} style={style} className="text-xl" />;
    case 'decrypted':
      return <DecryptedText text={text} style={style} className="text-xl" />;
    case 'ascii':
      return <ASCIIText text={text} style={style} className="text-xl" />;
    case 'ascii-3d':
      return (
        <div className="w-[400px] h-[150px] relative">
          <ASCIITextEffect 
            text={text}
            textColor={color}
            enableWaves={true}
            asciiFontSize={8}
            textFontSize={120}
          />
        </div>
      );
    case 'decrypted-advanced':
      return (
        <DecryptedTextEffect 
          text={text}
          speed={50}
          sequential={true}
          revealDirection="start"
          animateOn="view"
          className="text-xl"
          style={style}
        />
      );
    case 'fuzzy-canvas':
      return (
        <FuzzyTextEffect
          fontSize="clamp(1.5rem, 4vw, 3rem)"
          fontWeight={700}
          color={color}
          baseIntensity={0.15}
          hoverIntensity={0.4}
          enableHover={true}
          glitchMode={true}
          glitchInterval={4000}
          glitchDuration={300}
        >
          {text}
        </FuzzyTextEffect>
      );
    default:
      return null;
  }
}

export function StartScreen({ 
  onStart, 
  message = "Click anywhere to enter",
  font = "Inter",
  textColor = "#a855f7",
  bgColor = "#000000",
  textAnimation = "none"
}: StartScreenProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  
  const useTypewriter = textAnimation === 'none';

  useEffect(() => {
    if (!useTypewriter) {
      setDisplayedText(message);
      return;
    }
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < message.length) {
        setDisplayedText(message.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [message, useTypewriter]);

  useEffect(() => {
    if (!useTypewriter) return;
    
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, [useTypewriter]);

  const handleClick = () => {
    setIsVisible(false);
    setTimeout(onStart, 500);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: bgColor }}
          onClick={handleClick}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center flex items-center justify-center"
          >
            {useTypewriter ? (
              <p 
                className="text-xl"
                style={{ 
                  fontFamily: font,
                  color: textColor,
                }}
              >
                {displayedText}
                <span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>|</span>
              </p>
            ) : (
              <AnimatedText 
                text={message}
                animation={textAnimation}
                font={font}
                color={textColor}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
