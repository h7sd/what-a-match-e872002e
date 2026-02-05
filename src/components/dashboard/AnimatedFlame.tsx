import './AnimatedFlame.css';

interface AnimatedFlameProps {
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
}

export function AnimatedFlame({ size = 'md', isActive = true }: AnimatedFlameProps) {
  const sizeClasses = {
    sm: 'w-6 h-8',
    md: 'w-10 h-14',
    lg: 'w-14 h-20',
  };

  if (!isActive) {
    return (
      <div className={`${sizeClasses[size]} flex items-center justify-center`}>
        <div className="flame-inactive">
          <div className="flame-core-inactive" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} flame-container`}>
      <div className="flame">
        <div className="flame-shadow" />
        <div className="flame-main">
          <div className="flame-primary" />
          <div className="flame-secondary" />
          <div className="flame-tertiary" />
        </div>
        <div className="flame-core" />
        <div className="flame-sparks">
          <div className="spark spark-1" />
          <div className="spark spark-2" />
          <div className="spark spark-3" />
        </div>
      </div>
      <div className="flame-glow" />
    </div>
  );
}
