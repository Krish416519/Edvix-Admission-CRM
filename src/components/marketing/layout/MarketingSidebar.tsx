
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Megaphone, Target, Workflow, 
  BarChart3, Settings, PieChart, MessagesSquare, Lightbulb
} from 'lucide-react';
import { cn } from '../../../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/marketing', icon: LayoutDashboard, exact: true },
  { name: 'Campaigns', href: '/marketing/campaigns', icon: Megaphone },
  { name: 'ROI & Attribution', href: '/marketing/roi', icon: Target },
  { name: 'Journeys', href: '/marketing/journeys', icon: Workflow },
  { name: 'Reports', href: '/marketing/reports', icon: BarChart3 },
  { name: 'AI Insights', href: '/marketing/ai', icon: Lightbulb },
];

export function MarketingSidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
        <div className="flex items-center gap-2 text-primary">
          <PieChart className="h-6 w-6" />
          <span className="text-lg font-bold tracking-tight text-foreground">Marketing Hub</span>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.exact}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Tools
          </h3>
          <div className="space-y-1">
            <NavLink
              to="/marketing/templates"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <MessagesSquare className="w-5 h-5" />
              Ad Templates
            </NavLink>
            <NavLink
              to="/marketing/settings"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Settings className="w-5 h-5" />
              Settings
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
