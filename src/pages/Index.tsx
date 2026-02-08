import { useMemo } from 'react';
import { ControlPanel } from '@/components/simulation/ControlPanel';
import { FlightMap } from '@/components/simulation/FlightMap';
import { AlertsPanel } from '@/components/simulation/AlertsPanel';
import { StatsPanel } from '@/components/simulation/StatsPanel';
import { Header } from '@/components/simulation/Header';
import { useSimulation } from '@/hooks/useSimulation';
import { AIRPORTS } from '@/data/mockData';

const Index = () => {
  const {
    state,
    runSimulation,
    setScenario,
    setSeverity,
    setSelectedCity,
    setFlightCount,
    clearAlerts,
    getStats,
  } = useSimulation();

  const stats = useMemo(() => getStats(), [state.flights, state.airports]);

  const mapCenter = useMemo(() => {
    const airport = AIRPORTS.find(a => a.code === state.selectedCity);
    return airport?.position || { lat: 39.8283, lng: -98.5795 };
  }, [state.selectedCity]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <Header 
        isRunning={state.isRunning} 
        selectedCity={state.selectedCity}
        scenario={state.scenario}
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
          onCityChange={setSelectedCity}
          onScenarioChange={setScenario}
          onSeverityChange={setSeverity}
          onFlightCountChange={setFlightCount}
          onRunSimulation={runSimulation}
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
