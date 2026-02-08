import { useState, useEffect, lazy, Suspense } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Eye, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase-proxy-client';
import { useAuth } from '@/lib/auth';

// Lazy load Aurora for performance
const Aurora = lazy(() => import('@/components/ui/Aurora'));

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
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-5 space-y-4">
      {/* Aurora background effect */}
      <Suspense fallback={null}>
        <div className="absolute inset-0 opacity-15 group-hover:opacity-30 transition-opacity duration-500">
          <Aurora
            colorStops={['#00B4D8', '#00D9A5', '#0077B6']}
            amplitude={0.6}
            blend={0.7}
            speed={0.4}
          />
        </div>
      </Suspense>

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B4D8]/20 via-[#00D9A5]/15 to-[#0077B6]/20 flex items-center justify-center border border-[#00D9A5]/20">
              <Eye className="w-5 h-5 text-[#00D9A5]" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Profile Visitors</h3>
              <p className="text-xs text-white/40">Track your reach</p>
            </div>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-48 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D9A5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00D9A5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(10,10,11,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'white'
                }}
                labelStyle={{ color: 'white' }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#00D9A5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorViews)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-white/50">Visitors last {timeRange} days:</span>
            <span className="font-semibold text-white">{totalInRange}</span>
            <TrendingUp className="w-4 h-4 text-[#00D9A5]" />
          </div>
          <div className="text-white/40">
            Daily average: {dailyAverage} visitors/day
          </div>
        </div>
      </div>
    </div>
  );
}
