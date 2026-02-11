import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { ControlPanel } from '@/components/simulation/ControlPanel';
import { FlightMap } from '@/components/simulation/FlightMap';
import { AlertsPanel } from '@/components/simulation/AlertsPanel';
import { StatsPanel } from '@/components/simulation/StatsPanel';
import { Header } from '@/components/simulation/Header';
import { useSimulation } from '@/hooks/useSimulation';
import { useWeatherApi, AirportWeather } from '@/hooks/useWeatherApi';
import { AIRPORTS } from '@/data/mockData';
import { toast } from 'sonner';

const Index = () => {
  const {
    state,
    runSimulation,
    runSimulationWithRealWeather,
    setScenario,
    setSeverity,
    setSelectedCity,
    setFlightCount,
    clearAlerts,
    getStats,
  } = useSimulation();

  const { loading: weatherLoading, fetchWeather, weatherData } = useWeatherApi();
  const [useRealWeather, setUseRealWeather] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5); // minutes
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const stats = useMemo(() => getStats(), [state.flights, state.airports]);

  const mapCenter = useMemo(() => {
    const airport = AIRPORTS.find(a => a.code === state.selectedCity);
    return airport?.position || { lat: -6.0, lng: 147.0 };
  }, [state.selectedCity]);

  const handleFetchRealWeather = useCallback(async (silent = false) => {
    const data = await fetchWeather();
    if (data) {
      setUseRealWeather(true);
      setLastRefresh(new Date());
      runSimulationWithRealWeather(data.airports);
      if (!silent) {
        toast.success(`Loaded real weather for ${data.airports.length} airports`, {
          description: data.summary.hasStorms 
            ? '⚠️ Storm activity detected!' 
            : data.summary.hasRain 
              ? '🌧️ Rain in the region' 
              : '☀️ Generally clear conditions',
        });
      } else {
        toast.info('Weather data auto-refreshed', { duration: 2000 });
      }
    } else if (!silent) {
      toast.error('Failed to fetch weather data');
    }
  }, [fetchWeather, runSimulationWithRealWeather]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    if (autoRefresh && useRealWeather) {
      autoRefreshTimerRef.current = setInterval(() => {
        handleFetchRealWeather(true);
      }, refreshInterval * 60 * 1000);
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh, useRealWeather, refreshInterval, handleFetchRealWeather]);

  const handleRunSimulation = () => {
    setUseRealWeather(false);
    setAutoRefresh(false);
    runSimulation();
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <Header 
        isRunning={state.isRunning} 
        selectedCity={state.selectedCity}
        scenario={state.scenario}
        useRealWeather={useRealWeather}
        weatherSummary={weatherData?.summary}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Controls */}
        <ControlPanel
          selectedCity={state.selectedCity}
          scenario={state.scenario}
          severity={state.severity}
          flightCount={state.flightCount}
          isRunning={state.isRunning}
          weatherLoading={weatherLoading}
          useRealWeather={useRealWeather}
          autoRefresh={autoRefresh}
          refreshInterval={refreshInterval}
          lastRefresh={lastRefresh}
          onCityChange={setSelectedCity}
          onScenarioChange={setScenario}
          onSeverityChange={setSeverity}
          onFlightCountChange={setFlightCount}
          onRunSimulation={handleRunSimulation}
          onFetchRealWeather={() => handleFetchRealWeather(false)}
          onToggleAutoRefresh={() => setAutoRefresh(prev => !prev)}
          onRefreshIntervalChange={setRefreshInterval}
          onClearAlerts={clearAlerts}
        />

        {/* Center - Map */}
        <div className="flex-1 p-4">
          <FlightMap
            flights={state.flights}
            weatherZones={state.weatherZones}
            airports={state.airports}
            center={mapCenter}
          />
        </div>

        {/* Right Sidebar */}
        <div className="w-96 flex flex-col border-l border-border">
          {/* Stats Panel - Top */}
          <div className="flex-1 overflow-hidden border-b border-border">
            <StatsPanel stats={stats} isRunning={state.isRunning} />
          </div>
          
          {/* Alerts Panel - Bottom */}
          <div className="h-80 glass-panel">
            <AlertsPanel alerts={state.alerts} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
