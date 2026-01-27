import { Eye, Hash, User } from 'lucide-react';

interface OverviewStatsProps {
  profileViews: number;
  uidNumber: number;
  username: string;
}

export function OverviewStats({ profileViews, uidNumber, username }: OverviewStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
          <Eye className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold">{profileViews.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Profile Views</p>
        </div>
      </div>

      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
          <Hash className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold">#{uidNumber}</p>
          <p className="text-sm text-muted-foreground">User ID</p>
        </div>
      </div>

      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold">{username}</p>
          <p className="text-sm text-muted-foreground">Username</p>
        </div>
      </div>
    </div>
  );
}
