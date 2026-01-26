import { Link2, ExternalLink } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

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
  // Default sample data
  const data: LinkData[] = links.length > 0 ? links : [
    { name: 'Discord Server', clicks: 120, color: COLORS[0], url: '#' },
    { name: 'Discord', clicks: 44, color: COLORS[1], url: '#' },
    { name: 'Telegram', clicks: 43, color: COLORS[2], url: '#' },
    { name: 'PayPal', clicks: 23, color: COLORS[3], url: '#' },
    { name: 'Instagram', clicks: 22, color: COLORS[4], url: '#' },
  ];

  const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Top 5 Links</h3>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2">
          {data.map((link, index) => (
            <div 
              key={link.name}
              className="flex items-center justify-between py-1 group hover:bg-secondary/30 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: link.color }}
                />
                <span className="text-sm">{link.name}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm font-medium">{link.clicks}</span>
            </div>
          ))}
        </div>

        <div className="relative w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                dataKey="clicks"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold">{totalClicks}</span>
            <span className="text-xs text-muted-foreground">Total Clicks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
