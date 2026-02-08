import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { Plane, Clock, Route, Building2 } from 'lucide-react';
import { SimulationStats } from '@/types/simulation';

interface StatsPanelProps {
  stats: SimulationStats;
  isRunning: boolean;
}

const COLORS = {
  normal: '#00d4ff',
  rerouted: '#ff9500',
  delayed: '#eab308',
  grounded: '#ef4444',
};

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  color = 'primary'
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number;
  subValue?: string;
  color?: 'primary' | 'warning' | 'critical' | 'safe';
}) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    warning: 'text-weather-caution bg-weather-caution/10',
    critical: 'text-weather-critical bg-weather-critical/10',
    safe: 'text-weather-safe bg-weather-safe/10',
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="glass-panel p-4 rounded-lg"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subValue && <p className="text-xs text-primary">{subValue}</p>}
        </div>
      </div>
    </motion.div>
  );
}

export function StatsPanel({ stats, isRunning }: StatsPanelProps) {
  const flightStatusData = [
    { name: 'Normal', value: stats.totalFlights - stats.reroutedFlights - stats.delayedFlights - stats.groundedFlights, color: COLORS.normal },
    { name: 'Rerouted', value: stats.reroutedFlights, color: COLORS.rerouted },
    { name: 'Delayed', value: stats.delayedFlights, color: COLORS.delayed },
    { name: 'Grounded', value: stats.groundedFlights, color: COLORS.grounded },
  ].filter(d => d.value > 0);

  const impactData = [
    { name: 'Normal', flights: stats.totalFlights - stats.reroutedFlights - stats.delayedFlights - stats.groundedFlights },
    { name: 'Rerouted', flights: stats.reroutedFlights },
    { name: 'Delayed', flights: stats.delayedFlights },
    { name: 'Grounded', flights: stats.groundedFlights },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-2 rounded text-xs">
          <p className="text-foreground">{payload[0].name}: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  if (!isRunning) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          <Plane className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Data Yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Configure your weather scenario and run a simulation to see impact statistics
        </p>
      </div>
    );
  }

  return (
    <div className="h-full p-4 space-y-4 overflow-y-auto">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          icon={Plane} 
          label="Total Flights" 
          value={stats.totalFlights}
          color="primary"
        />
        <StatCard 
          icon={Route} 
          label="Rerouted" 
          value={stats.reroutedFlights}
          subValue={`+${stats.totalRerouteDistance} nm`}
          color="warning"
        />
        <StatCard 
          icon={Clock} 
          label="Avg Delay" 
          value={`${stats.averageDelay}m`}
          color={stats.averageDelay > 30 ? 'critical' : stats.averageDelay > 10 ? 'warning' : 'safe'}
        />
        <StatCard 
          icon={Building2} 
          label="Airports Closed" 
          value={stats.airportsClosed}
          color={stats.airportsClosed > 0 ? 'critical' : 'safe'}
        />
      </div>

      {/* Flight Status Pie Chart */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-medium text-foreground mb-4">Flight Status Distribution</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={flightStatusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {flightStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          {flightStatusData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-muted-foreground">{entry.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Impact Bar Chart */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-medium text-foreground mb-4">Weather Impact Summary</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={impactData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 10 }} 
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="flights" 
                fill="#00d4ff" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Congestion indicator */}
      <div className="glass-panel p-4 rounded-lg">
        <h3 className="text-sm font-medium text-foreground mb-3">System Congestion</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Airspace Load</span>
              <span className="font-mono text-foreground">
                {Math.min(100, Math.round((stats.reroutedFlights + stats.delayedFlights) / stats.totalFlights * 100))}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: `${Math.min(100, (stats.reroutedFlights + stats.delayedFlights) / stats.totalFlights * 100)}%` 
                }}
                className="h-full bg-gradient-to-r from-weather-safe via-weather-caution to-weather-critical"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Ground Delays</span>
              <span className="font-mono text-foreground">
                {Math.round(stats.groundedFlights / Math.max(1, stats.totalFlights) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: `${stats.groundedFlights / Math.max(1, stats.totalFlights) * 100}%` 
                }}
                className="h-full bg-weather-critical"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
