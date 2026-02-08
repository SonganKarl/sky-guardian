import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, AlertCircle, Clock } from 'lucide-react';
import { ATCAlert } from '@/types/simulation';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AlertsPanelProps {
  alerts: ATCAlert[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

function AlertIcon({ type }: { type: ATCAlert['type'] }) {
  switch (type) {
    case 'critical':
      return <AlertCircle className="w-4 h-4 text-weather-critical" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-weather-caution" />;
    default:
      return <Info className="w-4 h-4 text-atc-info" />;
  }
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-atc-alert" />
          <h2 className="font-semibold text-foreground">ATC Alerts</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className={`status-dot ${alerts.length > 0 ? 'status-warning alert-flash' : 'status-active'}`} />
          <span className="text-xs text-muted-foreground font-mono">{alerts.length}</span>
        </div>
      </div>

      {/* Alerts List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          <AnimatePresence mode="popLayout">
            {alerts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
                  <Info className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No active alerts</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Run a simulation to generate alerts</p>
              </motion.div>
            ) : (
              alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`p-3 rounded-lg border ${
                    alert.type === 'critical' 
                      ? 'bg-weather-critical/10 border-weather-critical/30' 
                      : alert.type === 'warning'
                      ? 'bg-weather-caution/10 border-weather-caution/30'
                      : 'bg-atc-info/10 border-atc-info/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <AlertIcon type={alert.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium leading-tight">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatTime(alert.timestamp)}
                        </span>
                        {alert.flightId && (
                          <span className="text-xs font-mono text-primary px-1.5 py-0.5 bg-primary/10 rounded">
                            {alert.flightId.replace('flight-', 'FLT-')}
                          </span>
                        )}
                        {alert.airportCode && (
                          <span className="text-xs font-mono text-accent px-1.5 py-0.5 bg-accent/10 rounded">
                            {alert.airportCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
