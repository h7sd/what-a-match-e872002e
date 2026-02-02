import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Menu, X, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ReportUserDialog } from './ReportUserDialog';
import { Magnet } from './Magnet';

export function ModernHeader() {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', to: '/premium' },
    { label: 'Discord', href: 'https://discord.gg/uservault', external: true },
    { label: 'Status', to: '/status' },
  ];

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? 'py-3' : 'py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div
            className={`flex items-center justify-between px-8 py-4 transition-all duration-500 ${
              isScrolled
                ? 'bg-background/80 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20'
                : 'bg-transparent'
            }`}
          >
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                UserVault
              </span>
            </Link>

            {/* Desktop Nav - Clean pill style */}
            <nav className="hidden md:flex items-center gap-1 bg-secondary/50 backdrop-blur-sm rounded-full px-2 py-1.5">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full transition-all duration-300"
                  >
                    {link.label}
                  </a>
                ) : link.href?.startsWith('#') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full transition-all duration-300"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.to!}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-full transition-all duration-300"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <ReportUserDialog />
              </div>
              
              {user ? (
                <Magnet magnetStrength={0.2}>
                  <Link
                    to="/dashboard"
                    className="relative text-sm px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 overflow-hidden group"
                  >
                    <span className="relative z-10">Dashboard</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-gradient-shift" />
                  </Link>
                </Magnet>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    to="/auth"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 font-medium"
                  >
                    Sign in
                  </Link>
                  <Magnet magnetStrength={0.2}>
                    <Link
                      to="/auth"
                      className="relative text-sm px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 overflow-hidden group"
                    >
                      <span className="relative z-10">Get Started</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Link>
                  </Magnet>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl transition-all"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 top-[80px] z-40 md:hidden px-6"
          >
            <div className="bg-card/95 backdrop-blur-2xl border border-border/50 rounded-2xl p-6 flex flex-col gap-2 shadow-2xl">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground py-3 px-4 rounded-xl hover:bg-white/5 transition-colors font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ) : link.href?.startsWith('#') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-foreground py-3 px-4 rounded-xl hover:bg-white/5 transition-colors font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.to!}
                    className="text-foreground py-3 px-4 rounded-xl hover:bg-white/5 transition-colors font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              )}
              
              <div className="pt-4 mt-2 border-t border-border/50 flex flex-col gap-3">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="text-center py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      className="text-center py-3 text-foreground font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/auth"
                      className="text-center py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
