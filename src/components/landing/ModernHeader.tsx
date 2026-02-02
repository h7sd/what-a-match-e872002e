import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ReportUserDialog } from './ReportUserDialog';

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
    { label: 'Discord', href: 'https://discord.gg/uservault', external: true },
    { label: 'Status', href: '/status' },
  ];

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'py-3' : 'py-5'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div
            className={`flex items-center justify-between px-6 py-3 rounded-2xl transition-all duration-300 ${
              isScrolled
                ? 'glass shadow-lg shadow-black/10'
                : 'bg-transparent'
            }`}
          >
            {/* Logo */}
            <Link 
              to="/" 
              className="text-lg font-bold text-foreground hover:text-primary transition-colors"
            >
              UserVault
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ) : link.href.startsWith('#') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <ReportUserDialog />
              </div>
              
              {user ? (
                <Link
                  to="/dashboard"
                  className="text-sm px-5 py-2 rounded-full bg-primary text-primary-foreground font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
                >
                  Dashboard
                </Link>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    to="/auth"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/auth"
                    className="text-sm px-5 py-2 rounded-full bg-primary text-primary-foreground font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
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
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-[72px] z-40 md:hidden px-6"
          >
            <div className="glass rounded-2xl p-6 flex flex-col gap-4">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ) : link.href.startsWith('#') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-foreground py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="text-foreground py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              )}
              
              <div className="pt-4 border-t border-border/50 flex flex-col gap-3">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="text-center py-3 rounded-full bg-primary text-primary-foreground font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      className="text-center py-3 text-foreground"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/auth"
                      className="text-center py-3 rounded-full bg-primary text-primary-foreground font-medium"
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
