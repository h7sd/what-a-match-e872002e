import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
}

export function TypewriterText({ text, speed = 100 }: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
    }
  }, [index, text, speed]);

  return (
    <span className={!isComplete ? 'typing-cursor' : ''}>
      {displayText}
    </span>
  );
}
