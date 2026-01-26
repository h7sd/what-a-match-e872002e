import { useState } from 'react';
import { Eye, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface VisitorData {
  date: string;
  visitors: number;
}

interface ProfileVisitorsChartProps {
  data?: VisitorData[];
  totalVisitors?: number;
  dailyAverage?: number;
}

export function ProfileVisitorsChart({ 
  data = [], 
  totalVisitors = 0,
  dailyAverage = 0 
}: ProfileVisitorsChartProps) {
  const [timeRange, setTimeRange] = useState('30');

  // Generate sample data if none provided
  const chartData = data.length > 0 ? data : generateSampleData(parseInt(timeRange));

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Profile Visitors</h3>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[140px] bg-secondary/50 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}`;
              }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="visitors"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorVisitors)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span>Visitors last {timeRange} days:</span>
          <span className="font-bold">{totalVisitors}</span>
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>
        <div className="text-muted-foreground">
          Daily average: {dailyAverage} visitors/day
        </div>
      </div>
    </div>
  );
}

function generateSampleData(days: number): VisitorData[] {
  const data: VisitorData[] = [];
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      visitors: Math.floor(Math.random() * 10),
    });
  }
  
  return data;
}
