import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendValue, subtitle }: StatCardProps) {
  return (
    <div className="bg-[var(--color-glass)] backdrop-blur-[40px] border border-[var(--color-glass-border)] rounded-[24px] p-5 shadow-xl hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="p-2 bg-primary/10 text-primary rounded-xl">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
        {(trendValue || subtitle) && (
          <div className="flex items-center gap-2 mt-1">
            {trendValue && (
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                trend === 'up' && "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-500",
                trend === 'down' && "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500",
                trend === 'neutral' && "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400"
              )}>
                {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendValue}
              </span>
            )}
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
