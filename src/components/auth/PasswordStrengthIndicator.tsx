import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export function getPasswordStrength(password: string): { score: number; isStrong: boolean; metRequirements: boolean[] } {
  const metRequirements = requirements.map((req) => req.test(password));
  const score = metRequirements.filter(Boolean).length;
  const isStrong = score >= 4; // At least 4 of 5 requirements must be met
  return { score, isStrong, metRequirements };
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const { score, metRequirements } = useMemo(() => getPasswordStrength(password), [password]);

  const getStrengthLabel = () => {
    if (password.length === 0) return '';
    if (score <= 1) return 'Very Weak';
    if (score === 2) return 'Weak';
    if (score === 3) return 'Fair';
    if (score === 4) return 'Strong';
    return 'Very Strong';
  };

  const getStrengthColor = () => {
    if (score <= 1) return 'bg-red-500';
    if (score === 2) return 'bg-orange-500';
    if (score === 3) return 'bg-yellow-500';
    if (score === 4) return 'bg-green-500';
    return 'bg-emerald-400';
  };

  const getTextColor = () => {
    if (score <= 1) return 'text-red-400';
    if (score === 2) return 'text-orange-400';
    if (score === 3) return 'text-yellow-400';
    if (score === 4) return 'text-green-400';
    return 'text-emerald-400';
  };

  if (password.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-white/50">Password Strength</span>
          <span className={cn('text-xs font-medium', getTextColor())}>{getStrengthLabel()}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300 rounded-full', getStrengthColor())}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements list */}
      <div className="grid grid-cols-1 gap-1.5">
        {requirements.map((req, index) => (
          <div
            key={req.label}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors duration-200',
              metRequirements[index] ? 'text-green-400' : 'text-white/40'
            )}
          >
            {metRequirements[index] ? (
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
