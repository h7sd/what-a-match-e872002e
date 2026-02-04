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

export function TopLinksChart({ links = [] }: TopLinksChartProps) {
  // Only show if there are actual links
  const data: LinkData[] = links.length > 0 ? links : [];

  const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);

  if (data.length === 0) {
    return (
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-5 space-y-4">
        {/* Static gradient background */}
        <div className="absolute inset-0 opacity-15 group-hover:opacity-30 transition-opacity duration-500 bg-gradient-to-br from-[#00B4D8]/30 via-[#00D9A5]/20 to-[#0077B6]/30" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B4D8]/20 via-[#00D9A5]/15 to-[#0077B6]/20 flex items-center justify-center border border-[#00D9A5]/20">
              <Link2 className="w-5 h-5 text-[#00D9A5]" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Top 5 Links</h3>
              <p className="text-xs text-white/40">Click analytics</p>
            </div>
          </div>
          <p className="text-sm text-white/40 text-center py-8">
            No links added yet. Add social links to see click analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-xl p-5 space-y-4">
      {/* Static gradient background */}
      <div className="absolute inset-0 opacity-15 group-hover:opacity-30 transition-opacity duration-500 bg-gradient-to-br from-[#00B4D8]/30 via-[#00D9A5]/20 to-[#0077B6]/30" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B4D8]/20 via-[#00D9A5]/15 to-[#0077B6]/20 flex items-center justify-center border border-[#00D9A5]/20">
              <Link2 className="w-5 h-5 text-[#00D9A5]" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Top 5 Links</h3>
              <p className="text-xs text-white/40">Click analytics</p>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-[#00D9A5]/10 border border-[#00D9A5]/20">
            <span className="text-xs font-medium text-[#00D9A5]">{totalClicks} clicks</span>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          {data.map((link, index) => (
            <div 
              key={link.name}
              className="flex items-center justify-between py-2 px-3 group/item hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <span 
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: link.color }}
                />
                <span className="text-sm text-white">{link.name}</span>
                <ExternalLink className="w-3 h-3 text-white/40 opacity-0 group-hover/item:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm font-medium text-white">{link.clicks}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
