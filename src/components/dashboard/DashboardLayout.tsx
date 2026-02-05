import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  User, 
  Palette, 
  Link2, 
  Award, 
  Settings, 
  Shield, 
  Crown, 
  Eye, 
  LogOut,
  Menu,
  X,
  Save,
  Loader2,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState, ReactNode, lazy, Suspense } from 'react';
import { AliasRequestsBell } from './AliasRequestsBell';
import { AdminChatNotificationBell } from '@/components/admin/AdminChatNotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';

// Lazy load heavy components
const FaultyTerminal = lazy(() => import('@/components/ui/FaultyTerminal'));
const Aurora = lazy(() => import('@/components/ui/Aurora'));

type TabType = 'overview' | 'profile' | 'appearance' | 'links' | 'badges' | 'marketplace' | 'admin' | 'settings';

const baseNavItems: { icon: React.ElementType; label: string; tab: TabType }[] = [
  { icon: LayoutDashboard, label: 'Overview', tab: 'overview' },
  { icon: User, label: 'Profile', tab: 'profile' },
  { icon: Palette, label: 'Appearance', tab: 'appearance' },
  { icon: Link2, label: 'Links', tab: 'links' },
  { icon: Award, label: 'Badges', tab: 'badges' },
  { icon: ShoppingBag, label: 'Marketplace', tab: 'marketplace' },
  { icon: Settings, label: 'Settings', tab: 'settings' },
];

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isAdmin: boolean;
  isPremium: boolean;
  username: string;
  onSignOut: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export function DashboardLayout({
  children,
  activeTab,
  onTabChange,
  isAdmin,
  isPremium,
  username,
  onSignOut,
  onSave,
  isSaving
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const navItems = [
    ...baseNavItems,
    ...(isAdmin ? [{ icon: Shield, label: 'Admin', tab: 'admin' as TabType }] : []),
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className="p-5 border-b border-white/5">
        <Link to="/" className="flex items-center gap-3 group">
          <div 
            className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-105"
          >
            {/* Subtle shine effect - CSS only */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
            />
            <span className="relative text-white font-bold text-sm">UV</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white">UserVault</span>
            <span className="text-[10px] text-white/40 -mt-1">Dashboard</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          
          return (
            <button
              key={item.tab}
              onClick={() => {
                onTabChange(item.tab);
                setMobileMenuOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm text-left relative overflow-hidden group',
                'transition-all duration-200 ease-out',
                isActive 
                  ? 'text-white' 
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03] hover:translate-x-1'
              )}
            >
              {/* Active background with glow - CSS transition */}
              <div 
                className={cn(
                  'absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-xl',
                  'transition-opacity duration-200',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
              />
              
              {/* Active indicator line - CSS transition */}
              <div 
                className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-gradient-to-b from-primary via-primary to-accent rounded-r-full',
                  'transition-all duration-200',
                  isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
                )}
              />

              <div className={cn(
                'relative z-10 w-9 h-9 rounded-lg flex items-center justify-center',
                'transition-all duration-200',
                isActive 
                  ? 'bg-primary/20' 
                  : 'bg-white/5 group-hover:bg-white/10'
              )}>
                <Icon className={cn(
                  'w-4 h-4 transition-colors duration-200',
                  isActive ? 'text-primary' : 'text-white/60 group-hover:text-white/80'
                )} />
              </div>
              
              <span className="relative z-10 font-medium">{item.label}</span>
              
              {isActive && (
                <div className="relative z-10 ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-white/5 space-y-2">
        {/* Premium Status */}
        {!isPremium ? (
          <div className="transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-12 border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent text-amber-400 hover:bg-amber-500/15 hover:border-amber-500/30 hover:text-amber-300 rounded-xl transition-all" 
              asChild
            >
              <Link to="/premium">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">Upgrade</span>
                  <span className="text-[10px] text-amber-400/60">Unlock all features</span>
                </div>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/20">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-600/20 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-amber-400">Premium</span>
              <p className="text-[10px] text-amber-400/50">All features unlocked</p>
            </div>
          </div>
        )}

        {/* View Profile */}
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 h-11 text-white/50 hover:text-white hover:bg-white/5 rounded-xl" 
          asChild
        >
          <Link to={`/${username}`} target="_blank">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-sm">View Profile</span>
          </Link>
        </Button>
        
        {/* Sign Out */}
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 h-11 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl group"
          onClick={onSignOut}
        >
          <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-red-500/20 flex items-center justify-center transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="text-sm">Sign Out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex">
      {/* Global Aurora Background for all tabs except admin */}
      {activeTab !== 'admin' && (
        <Suspense fallback={null}>
          <div className="fixed inset-0 z-0 opacity-40">
            <Aurora
              colorStops={['#00B4D8', '#00D9A5', '#0077B6']}
              amplitude={1.0}
              blend={0.5}
              speed={0.5}
            />
          </div>
        </Suspense>
      )}

      {/* Admin Terminal Background - optimized for mobile */}
      {activeTab === 'admin' && !isMobile && (
        <Suspense fallback={null}>
          <div className="fixed inset-0 z-0">
            <FaultyTerminal
              scale={1.5}
              gridMul={[2, 1]}
              digitSize={1.2}
              timeScale={0.3}
              pause={false}
              scanlineIntensity={0.3}
              glitchAmount={0.8}
              flickerAmount={0.5}
              noiseAmp={0.8}
              chromaticAberration={0}
              dither={0}
              curvature={0.05}
              tint="#00D9A5"
              mouseReact
              mouseStrength={0.3}
              pageLoadAnimation
              brightness={0.4}
            />
          </div>
        </Suspense>
      )}
      
      {/* Mobile admin background - simple gradient instead of heavy terminal */}
      {activeTab === 'admin' && isMobile && (
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#0a0a0b] via-[#0d1a15] to-[#0a0a0b]">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(0deg,transparent_24%,rgba(0,217,165,0.03)_25%,rgba(0,217,165,0.03)_26%,transparent_27%,transparent_74%,rgba(0,217,165,0.03)_75%,rgba(0,217,165,0.03)_76%,transparent_77%)] bg-[length:50px_50px]" />
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(90deg,transparent_24%,rgba(0,217,165,0.03)_25%,rgba(0,217,165,0.03)_26%,transparent_27%,transparent_74%,rgba(0,217,165,0.03)_75%,rgba(0,217,165,0.03)_76%,transparent_77%)] bg-[length:50px_50px]" />
          </div>
        </div>
      )}
      
      {/* Subtle background gradient overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00B4D8]/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#00D9A5]/3 rounded-full blur-[100px]" />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 min-h-screen bg-[#0d0d0e]/80 backdrop-blur-2xl border-r border-white/[0.04] flex-col fixed left-0 top-0 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d0d0e]/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex items-center justify-between p-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">UV</span>
            </div>
            <span className="text-lg font-bold text-white">UserVault</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <AdminChatNotificationBell />
            <AliasRequestsBell />
            
            <div className="transition-transform duration-150 hover:scale-105 active:scale-95">
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 rounded-lg h-9 px-3"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-white/5 h-9 w-9">
                  <Menu className="w-5 h-5 text-white/70" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-[#0d0d0e]/95 backdrop-blur-2xl border-white/[0.04]">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 mt-14 md:mt-0 relative z-10">
        {/* Desktop Header */}
        <header className="hidden md:block border-b border-white/[0.04] bg-[#0d0d0e]/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {navItems.find(item => item.tab === activeTab)?.icon && (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
                  {(() => {
                    const Icon = navItems.find(item => item.tab === activeTab)?.icon;
                    return Icon ? <Icon className="w-5 h-5 text-primary" /> : null;
                  })()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {navItems.find(item => item.tab === activeTab)?.label}
                </h1>
                <p className="text-xs text-white/40">
                  Manage your {activeTab === 'overview' ? 'dashboard' : activeTab}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <AdminChatNotificationBell />
              <AliasRequestsBell />
              
              <div className="transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]">
                <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 rounded-xl h-10 px-5 gap-2 shadow-lg shadow-primary/20"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span className="font-medium">Save Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - simplified animations */}
        <div className="p-4 sm:p-6">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export type { TabType };
