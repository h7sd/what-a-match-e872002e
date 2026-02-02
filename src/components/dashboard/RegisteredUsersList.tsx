import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Users, ExternalLink, Loader2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getFeaturedProfiles, FeaturedProfile } from '@/lib/api';
import { Input } from '@/components/ui/input';

export function RegisteredUsersList() {
  const [users, setUsers] = useState<FeaturedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 500, damping: 100 });
  const springY = useSpring(mouseY, { stiffness: 500, damping: 100 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const profiles = await getFeaturedProfiles(1000);
        setUsers(profiles);
      } catch (err) {
        console.error('Error fetching users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.u.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.d && user.d.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 flex items-center justify-center min-h-[280px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5 space-y-4"
    >
      {/* Spotlight effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${springX}px ${springY}px, rgba(0, 217, 165, 0.06), transparent 40%)`,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white text-sm">Community</h3>
            <p className="text-xs text-white/40">{users.length} registered users</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-white/[0.03] border-white/[0.06] text-sm placeholder:text-white/30"
          />
        </div>

        <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {filteredUsers.map((user, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.5) }}
            >
              <Link
                to={`/${user.u}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group/item"
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                    <span className="text-xs font-semibold text-primary">
                      {user.u.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.d || user.u}
                  </p>
                  <p className="text-xs text-white/40 truncate">
                    @{user.u} · #{user.n}
                  </p>
                </div>

                <ExternalLink className="w-4 h-4 text-white/20 opacity-0 group-hover/item:opacity-100 transition-opacity" />
              </Link>
            </motion.div>
          ))}

          {filteredUsers.length === 0 && (
            <p className="text-sm text-white/40 text-center py-8">
              {searchQuery ? 'No users found' : 'No users registered yet'}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
