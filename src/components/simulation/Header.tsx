import { motion } from 'framer-motion';
import { Radar, Clock, Wifi, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeaderProps {
  isRunning: boolean;
  selectedCity: string;
  scenario: string;
}

export function Header({ isRunning, selectedCity, scenario }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-14 glass-panel border-b border-border flex items-center justify-between px-6"
    >
      {/* Left - Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radar className="w-6 h-6 text-primary" />
            {isRunning && (
              <motion.div
                className="absolute inset-0 rounded-full border border-primary"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <span className="font-semibold text-foreground">PNG ATC Weather Simulator</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Target:</span>
          <span className="font-mono text-primary">{selectedCity}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Scenario:</span>
          <span className="font-mono text-accent capitalize">{scenario}</span>
        </div>
      </div>

      {/* Right - Status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${isRunning ? 'text-weather-safe' : 'text-muted-foreground'}`} />
          <span className="text-sm text-muted-foreground">
            {isRunning ? 'Simulation Active' : 'Standby'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-weather-safe" />
          <span className="text-sm text-muted-foreground">Connected</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono text-sm text-foreground">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </span>
          <span className="text-xs text-muted-foreground">UTC</span>
        </div>
      </div>
    </motion.header>
  );
}
