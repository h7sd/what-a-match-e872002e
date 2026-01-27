import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Eye, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface ProfileVisitorsChartProps {
  totalVisitors?: number;
  profileId?: string;
}

interface ViewData {
  date: string;
  views: number;
}

export function ProfileVisitorsChart({ 
  totalVisitors = 0,
  profileId 
}: ProfileVisitorsChartProps) {
  const [timeRange, setTimeRange] = useState('30');
  const [data, setData] = useState<ViewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchViewData = async () => {
      if (!profileId && !user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get profile ID if not provided
        let targetProfileId = profileId;
        if (!targetProfileId && user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
          targetProfileId = profile?.id;
        }

        if (!targetProfileId) {
          setIsLoading(false);
          return;
        }

        const daysAgo = parseInt(timeRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        const { data: views, error } = await supabase
          .from('profile_views')
          .select('viewed_at')
          .eq('profile_id', targetProfileId)
          .gte('viewed_at', startDate.toISOString())
          .order('viewed_at', { ascending: true });

        if (error) throw error;

        // Group views by date
        const viewsByDate: Record<string, number> = {};
        
        // Initialize all dates with 0
        for (let i = 0; i < daysAgo; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (daysAgo - 1 - i));
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          viewsByDate[dateStr] = 0;
        }

        // Count actual views
        views?.forEach((view) => {
          const date = new Date(view.viewed_at);
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          viewsByDate[dateStr] = (viewsByDate[dateStr] || 0) + 1;
        });

        const chartData = Object.entries(viewsByDate).map(([date, views]) => ({
          date,
          views,
        }));

        setData(chartData);
      } catch (err) {
        console.error('Error fetching view data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchViewData();
  }, [timeRange, profileId, user]);

  const totalInRange = data.reduce((sum, item) => sum + item.views, 0);
  const dailyAverage = data.length > 0 ? Math.round(totalInRange / data.length * 10) / 10 : 0;

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Profile Visitors</h3>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="views"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorViews)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Visitors last {timeRange} days:</span>
          <span className="font-semibold">{totalInRange}</span>
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>
        <div className="text-muted-foreground">
          Daily average: {dailyAverage} visitors/day
        </div>
      </div>
    </div>
  );
}
