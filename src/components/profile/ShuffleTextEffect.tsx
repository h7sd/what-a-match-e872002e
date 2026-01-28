import React, { useRef, useEffect, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import './ShuffleTextEffect.css';

export interface ShuffleTextEffectProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  shuffleDirection?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  ease?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  textAlign?: React.CSSProperties['textAlign'];
  onShuffleComplete?: () => void;
  shuffleTimes?: number;
  animationMode?: 'random' | 'evenodd';
  loop?: boolean;
  loopDelay?: number;
  stagger?: number;
  scrambleCharset?: string;
  colorFrom?: string;
  colorTo?: string;
  triggerOnHover?: boolean;
  autoPlay?: boolean;
}

const ShuffleTextEffect: React.FC<ShuffleTextEffectProps> = ({
  text,
  className = '',
  style = {},
  shuffleDirection = 'right',
  duration = 0.35,
  ease = 'power3.out',
  tag = 'p',
  textAlign = 'center',
  onShuffleComplete,
  shuffleTimes = 1,
  animationMode = 'evenodd',
  loop = false,
  loopDelay = 0,
  stagger = 0.03,
  scrambleCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',
  colorFrom,
  colorTo,
  triggerOnHover = true,
  autoPlay = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [chars, setChars] = useState<string[]>([]);
  const charsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const wrappersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const isPlayingRef = useRef(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Split text into characters
  useEffect(() => {
    setChars(text.split(''));
  }, [text]);

  const getRandomChar = () => {
    return scrambleCharset.charAt(Math.floor(Math.random() * scrambleCharset.length));
  };

  const playAnimation = () => {
    if (isPlayingRef.current || !containerRef.current) return;
    isPlayingRef.current = true;

    const wrappers = wrappersRef.current.filter(Boolean) as HTMLSpanElement[];
    if (!wrappers.length) return;

    // Kill existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const isVertical = shuffleDirection === 'up' || shuffleDirection === 'down';
    const rolls = Math.max(1, Math.floor(shuffleTimes));

    // Setup each character wrapper
    wrappers.forEach((wrapper, index) => {
      const inner = wrapper.querySelector('.shuffle-inner') as HTMLElement;
      const charSpans = wrapper.querySelectorAll('.shuffle-char-item');
      if (!inner || !charSpans.length) return;

      const charWidth = charSpans[0].getBoundingClientRect().width;
      const charHeight = charSpans[0].getBoundingClientRect().height;

      // Create scramble characters
      const scrambleContainer = document.createElement('span');
      scrambleContainer.className = 'shuffle-scramble-container';
      scrambleContainer.style.display = isVertical ? 'flex' : 'inline-flex';
      scrambleContainer.style.flexDirection = isVertical ? 'column' : 'row';

      // Add original char first
      const origClone = charSpans[0].cloneNode(true) as HTMLElement;
      scrambleContainer.appendChild(origClone);

      // Add scramble chars
      for (let i = 0; i < rolls; i++) {
        const scrambleSpan = document.createElement('span');
        scrambleSpan.className = 'shuffle-char-item';
        scrambleSpan.textContent = getRandomChar();
        scrambleSpan.style.width = `${charWidth}px`;
        scrambleSpan.style.display = 'inline-block';
        scrambleSpan.style.textAlign = 'center';
        scrambleContainer.appendChild(scrambleSpan);
      }

      // Add final char
      const finalClone = charSpans[0].cloneNode(true) as HTMLElement;
      scrambleContainer.appendChild(finalClone);

      inner.innerHTML = '';
      inner.appendChild(scrambleContainer);

      // Calculate positions
      const steps = rolls + 1;
      let startPos = 0;
      let endPos = 0;

      if (shuffleDirection === 'right') {
        startPos = -steps * charWidth;
        endPos = 0;
      } else if (shuffleDirection === 'left') {
        startPos = 0;
        endPos = -steps * charWidth;
      } else if (shuffleDirection === 'down') {
        startPos = -steps * charHeight;
        endPos = 0;
      } else if (shuffleDirection === 'up') {
        startPos = 0;
        endPos = -steps * charHeight;
      }

      // Set initial position
      if (isVertical) {
        gsap.set(scrambleContainer, { y: startPos });
        scrambleContainer.dataset.endY = String(endPos);
      } else {
        gsap.set(scrambleContainer, { x: startPos });
        scrambleContainer.dataset.endX = String(endPos);
      }

      if (colorFrom) {
        gsap.set(scrambleContainer, { color: colorFrom });
      }
    });

    // Create animation timeline
    const tl = gsap.timeline({
      repeat: loop ? -1 : 0,
      repeatDelay: loopDelay,
      onComplete: () => {
        isPlayingRef.current = false;
        onShuffleComplete?.();
      },
      onRepeat: () => {
        onShuffleComplete?.();
      }
    });

    const containers = wrappers.map(w => w.querySelector('.shuffle-scramble-container')).filter(Boolean) as HTMLElement[];

    if (animationMode === 'evenodd') {
      const odd = containers.filter((_, i) => i % 2 === 1);
      const even = containers.filter((_, i) => i % 2 === 0);

      if (odd.length) {
        tl.to(odd, {
          [isVertical ? 'y' : 'x']: (i: number, el: HTMLElement) => parseFloat(el.dataset[isVertical ? 'endY' : 'endX'] || '0'),
          duration,
          ease,
          stagger,
          ...(colorTo && { color: colorTo })
        }, 0);
      }

      if (even.length) {
        const oddDuration = duration + Math.max(0, odd.length - 1) * stagger;
        tl.to(even, {
          [isVertical ? 'y' : 'x']: (i: number, el: HTMLElement) => parseFloat(el.dataset[isVertical ? 'endY' : 'endX'] || '0'),
          duration,
          ease,
          stagger,
          ...(colorTo && { color: colorTo })
        }, oddDuration * 0.7);
      }
    } else {
      containers.forEach((container, index) => {
        const delay = Math.random() * 0.3;
        tl.to(container, {
          [isVertical ? 'y' : 'x']: parseFloat(container.dataset[isVertical ? 'endY' : 'endX'] || '0'),
          duration,
          ease,
          ...(colorTo && { color: colorTo })
        }, delay);
      });
    }

    timelineRef.current = tl;
  };

  // Initial setup
  useEffect(() => {
    if (chars.length > 0) {
      setIsReady(true);
      if (autoPlay) {
        const timer = setTimeout(() => {
          playAnimation();
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [chars, autoPlay]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (triggerOnHover && !isPlayingRef.current) {
      playAnimation();
    }
  };

  const commonStyle: React.CSSProperties = useMemo(() => ({ 
    textAlign, 
    ...style 
  }), [textAlign, style]);

  const Tag = tag as keyof JSX.IntrinsicElements;

  return (
    <div
      ref={containerRef}
      className={`shuffle-parent ${isReady ? 'is-ready' : ''} ${className}`}
      style={commonStyle}
      onMouseEnter={handleMouseEnter}
    >
      {React.createElement(
        Tag,
        { className: 'shuffle-text-container' },
        chars.map((char, index) => (
          <span
            key={index}
            ref={(el) => { wrappersRef.current[index] = el; }}
            className="shuffle-char-wrapper"
            style={{ 
              display: 'inline-block',
              overflow: 'hidden',
              verticalAlign: 'bottom'
            }}
          >
            <span className="shuffle-inner" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
              <span
                ref={(el) => { charsRef.current[index] = el; }}
                className="shuffle-char-item"
                style={{ display: 'inline-block', textAlign: 'center' }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            </span>
          </span>
        ))
      )}
    </div>
  );
};

export default ShuffleTextEffect;
