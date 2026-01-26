import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  User, 
  Palette, 
  Link2, 
  Puzzle, 
  Sparkles,
  Settings,
  LogOut,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  username: string;
  onSignOut: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard', tab: 'overview' },
  { icon: User, label: 'Profile', href: '/dashboard', tab: 'profile' },
  { icon: Palette, label: 'Appearance', href: '/dashboard', tab: 'appearance' },
  { icon: Link2, label: 'Links', href: '/dashboard', tab: 'links' },
  { icon: Puzzle, label: 'Widgets', href: '/dashboard', tab: 'widgets' },
  { icon: Sparkles, label: 'Effects', href: '/dashboard', tab: 'effects' },
];

export function Sidebar({ username, onSignOut }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">UV</span>
          </div>
          <span className="text-xl font-bold gradient-text">UserVault</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.hash === `#${item.tab}` || 
            (location.hash === '' && item.tab === 'overview');
          
          return (
            <Link
              key={item.tab}
              to={`${item.href}#${item.tab}`}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all',
                isActive 
                  ? 'bg-primary/10 text-primary border-l-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-border space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3" 
          asChild
        >
          <Link to={`/${username}`} target="_blank">
            <Eye className="w-4 h-4" />
            View Profile
          </Link>
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={onSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
