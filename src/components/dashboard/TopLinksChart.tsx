import { Link2, ExternalLink } from 'lucide-react';

interface LinkData {
  name: string;
  clicks: number;
  color: string;
  url?: string;
}

interface TopLinksChartProps {
  links?: LinkData[];
}

const COLORS = ['#3B82F6', '#22C55E', '#EAB308', '#8B5CF6', '#EC4899'];

export function TopLinksChart({ links = [] }: TopLinksChartProps) {
  // Only show if there are actual links
  const data: LinkData[] = links.length > 0 ? links : [];

  const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);

  if (data.length === 0) {
    return (
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Top 5 Links</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          No links added yet. Add social links to see click analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Top 5 Links</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {totalClicks} total clicks
        </div>
      </div>

      <div className="space-y-2">
        {data.map((link, index) => (
          <div 
            key={link.name}
            className="flex items-center justify-between py-2 px-3 group hover:bg-secondary/30 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <span 
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: link.color }}
              />
              <span className="text-sm">{link.name}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-sm font-medium">{link.clicks}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
