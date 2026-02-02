import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getFeaturedProfiles, FeaturedProfile } from '@/lib/api';

export function RegisteredUsersList() {
  const [users, setUsers] = useState<FeaturedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Use secure API proxy - no direct database access
        const profiles = await getFeaturedProfiles(100);
        setUsers(profiles);
      } catch (err) {
        console.error('Error fetching users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="glass-card p-5 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Registered Users</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {users.length} users
        </span>
      </div>

      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
        {users.map((user, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              to={`/${user.u}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {user.u.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.d || user.u}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{user.u} · #{user.n}
                </p>
              </div>

              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </motion.div>
        ))}

        {users.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No users registered yet.
          </p>
        )}
      </div>
    </div>
  );
}
