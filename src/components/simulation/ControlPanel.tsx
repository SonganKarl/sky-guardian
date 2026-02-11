import { motion } from 'framer-motion';
import { Cloud, CloudRain, Wind, Eye, Plane, Play, RotateCcw, CloudSun, Loader2, RefreshCw, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WeatherScenario, WeatherSeverity } from '@/types/simulation';
import { AIRPORTS } from '@/data/mockData';

interface ControlPanelProps {
  selectedCity: string;
  scenario: WeatherScenario;
  severity: WeatherSeverity;
  flightCount: number;
  isRunning: boolean;
  weatherLoading?: boolean;
  useRealWeather?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  lastRefresh?: Date | null;
  onCityChange: (city: string) => void;
  onScenarioChange: (scenario: WeatherScenario) => void;
  onSeverityChange: (severity: WeatherSeverity) => void;
  onFlightCountChange: (count: number) => void;
  onRunSimulation: () => void;
  onFetchRealWeather?: () => void;
  onToggleAutoRefresh?: () => void;
  onRefreshIntervalChange?: (minutes: number) => void;
  onClearAlerts: () => void;
}

const scenarios: { value: WeatherScenario; label: string; icon: React.ReactNode }[] = [
  { value: 'storm', label: 'Thunderstorm', icon: <CloudRain className="w-4 h-4" /> },
  { value: 'fog', label: 'Dense Fog', icon: <Cloud className="w-4 h-4" /> },
  { value: 'crosswinds', label: 'Crosswinds', icon: <Wind className="w-4 h-4" /> },
  { value: 'clear', label: 'Clear Skies', icon: <Eye className="w-4 h-4" /> },
];

const severities: { value: WeatherSeverity; label: string; color: string }[] = [
  { value: 'safe', label: 'Mild', color: 'bg-weather-safe' },
  { value: 'caution', label: 'Moderate', color: 'bg-weather-caution' },
  { value: 'critical', label: 'Severe', color: 'bg-weather-critical' },
];

export function ControlPanel({
  selectedCity,
  scenario,
  severity,
  flightCount,
  isRunning,
  weatherLoading = false,
  useRealWeather = false,
  autoRefresh = false,
  refreshInterval = 5,
  lastRefresh,
  onCityChange,
  onScenarioChange,
  onSeverityChange,
  onFlightCountChange,
  onRunSimulation,
  onFetchRealWeather,
  onToggleAutoRefresh,
  onRefreshIntervalChange,
  onClearAlerts,
}: ControlPanelProps) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-80 h-full glass-panel p-6 flex flex-col gap-6 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Plane className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Weather Impact</h1>
          <p className="text-sm text-muted-foreground">Flight Simulation</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Real Weather Button */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground flex items-center gap-2">
          <CloudSun className="w-4 h-4 text-primary" />
          Live Weather Data
        </Label>
        <Button
          onClick={onFetchRealWeather}
          disabled={weatherLoading}
          variant={useRealWeather ? "default" : "outline"}
          className={`w-full gap-2 ${useRealWeather ? 'bg-primary hover:bg-primary/90' : 'border-primary/50 text-primary hover:bg-primary/10'}`}
        >
          {weatherLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching Weather...
            </>
          ) : (
            <>
              <CloudSun className="w-4 h-4" />
              {useRealWeather ? 'Refresh Real Weather' : 'Fetch Real Weather'}
            </>
          )}
        </Button>
        {useRealWeather && (
          <p className="text-xs text-weather-safe flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-weather-safe animate-pulse" />
            Using live OpenWeatherMap data
          </p>
        )}
        {useRealWeather && (
          <div className="space-y-3 mt-2 p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 text-primary ${autoRefresh ? 'animate-spin' : ''}`} style={autoRefresh ? { animationDuration: '3s' } : {}} />
                Auto-Refresh
              </Label>
              <Switch
                checked={autoRefresh}
                onCheckedChange={() => onToggleAutoRefresh?.()}
              />
            </div>
            {autoRefresh && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    Every
                  </Label>
                  <span className="text-xs font-mono text-primary">{refreshInterval} min</span>
                </div>
                <Slider
                  value={[refreshInterval]}
                  onValueChange={([v]) => onRefreshIntervalChange?.(v)}
                  min={1}
                  max={15}
                  step={1}
                  className="py-1"
                />
              </div>
            )}
            {lastRefresh && (
              <p className="text-xs text-muted-foreground">
                Last update: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Divider with OR */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">OR SIMULATE</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Airport Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Target Airport</Label>
        <Select value={selectedCity} onValueChange={onCityChange}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AIRPORTS.map(airport => (
              <SelectItem key={airport.code} value={airport.code}>
                <span className="font-mono text-primary">{airport.code}</span>
                <span className="ml-2 text-muted-foreground text-xs">{airport.name.split(' ')[0]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weather Scenario */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Weather Scenario</Label>
        <div className="grid grid-cols-2 gap-2">
          {scenarios.map(s => (
            <button
              key={s.value}
              onClick={() => onScenarioChange(s.value)}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                scenario === s.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-secondary/50 text-muted-foreground hover:border-primary/50'
              }`}
            >
              {s.icon}
              <span className="text-xs font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Severity */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Severity Level</Label>
        <div className="flex gap-2">
          {severities.map(s => (
            <button
              key={s.value}
              onClick={() => onSeverityChange(s.value)}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                severity === s.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-secondary/50 hover:border-primary/50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-xs font-medium text-foreground">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Flight Count */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">Active Flights</Label>
          <span className="font-mono text-primary text-sm">{flightCount}</span>
        </div>
        <Slider
          value={[flightCount]}
          onValueChange={([value]) => onFlightCountChange(value)}
          min={5}
          max={50}
          step={5}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>5</span>
          <span>50</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Action Buttons */}
      <div className="space-y-3 mt-auto">
        <Button 
          onClick={onRunSimulation} 
          className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-medium gap-2 border border-border"
          variant="outline"
        >
          <Play className="w-4 h-4" />
          {isRunning && !useRealWeather ? 'Re-run Simulation' : 'Run Mock Simulation'}
        </Button>
        
        <Button 
          onClick={onClearAlerts}
          variant="outline" 
          className="w-full border-border text-muted-foreground hover:text-foreground gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Clear Alerts
        </Button>
      </div>

      {/* Status */}
      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
        <div className="flex items-center gap-2">
          <div className={`status-dot ${isRunning ? (useRealWeather ? 'status-active' : 'status-warning') : 'status-warning'}`} />
          <span className="text-xs font-medium text-muted-foreground">
            {isRunning 
              ? useRealWeather 
                ? 'Live Weather Active' 
                : 'Mock Simulation Active'
              : 'Ready to Simulate'
            }
          </span>
        </div>
      </div>
    </motion.div>
  );
}
