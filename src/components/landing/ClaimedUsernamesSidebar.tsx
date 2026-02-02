import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, User, Award } from 'lucide-react';
import { getFeaturedProfiles, FeaturedProfile } from '@/lib/api';
import { Link } from 'react-router-dom';

export function ClaimedUsernamesSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [rareUsers, setRareUsers] = useState<FeaturedProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use secure API proxy - no direct database access
        const profiles = await getFeaturedProfiles(20);
        setRareUsers(profiles);
      } catch (error) {
        console.error('Error fetching sidebar data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-card/90 backdrop-blur-sm border border-border rounded-r-lg p-2 hover:bg-secondary/50 transition-colors"
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </motion.button>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 bg-card/95 backdrop-blur-xl border-r border-border z-40 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-bold gradient-text">UserVault Highlights</h2>
              <p className="text-xs text-muted-foreground mt-1">Featured users</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Featured Users Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">Featured Users</h3>
                    </div>
                    <div className="space-y-2">
                      {rareUsers.slice(0, 10).map((user, index) => (
                        <Link
                          key={index}
                          to={`/${user.u}`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-full bg-secondary/50 overflow-hidden flex-shrink-0">
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              @{user.u}
                            </p>
                            {user.d && (
                              <p className="text-xs text-muted-foreground truncate">
                                {user.d}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}
