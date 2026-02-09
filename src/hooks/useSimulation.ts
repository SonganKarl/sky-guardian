import { useState, useCallback, useEffect } from 'react';
import { 
  Flight, 
  WeatherZone, 
  Airport, 
  ATCAlert, 
  SimulationState, 
  SimulationStats,
  WeatherScenario,
  WeatherSeverity,
  Position
} from '@/types/simulation';
import { AIRPORTS, generateFlights, generateWeatherZones, getDistanceKm } from '@/data/mockData';

function isFlightInWeatherZone(flight: Flight, zone: WeatherZone): boolean {
  return getDistanceKm(flight.position, zone.center) < zone.radius;
}

function generateReroutePath(flight: Flight, zone: WeatherZone): Position[] {
  if (!flight.originalPath) return [];
  
  const path = [...flight.originalPath];
  const avoidanceAngle = Math.random() > 0.5 ? 1 : -1;
  const offsetDistance = zone.radius * 1.5 / 111; // Convert km to degrees
  
  return path.map(point => {
    const distToZone = getDistanceKm(point, zone.center);
    if (distToZone < zone.radius * 1.5) {
      const angle = Math.atan2(point.lat - zone.center.lat, point.lng - zone.center.lng);
      return {
        lat: point.lat + Math.sin(angle + avoidanceAngle * Math.PI / 2) * offsetDistance,
        lng: point.lng + Math.cos(angle + avoidanceAngle * Math.PI / 2) * offsetDistance,
      };
    }
    return point;
  });
}

export function useSimulation() {
  const [state, setState] = useState<SimulationState>({
    flights: [],
    weatherZones: [],
    airports: AIRPORTS,
    alerts: [],
    selectedCity: 'POM',
    scenario: 'clear',
    severity: 'caution',
    flightCount: 15,
    isRunning: false,
  });

  const addAlert = useCallback((alert: Omit<ATCAlert, 'id' | 'timestamp'>) => {
    const newAlert: ATCAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setState(prev => ({
      ...prev,
      alerts: [newAlert, ...prev.alerts].slice(0, 50), // Keep last 50 alerts
    }));
  }, []);

  const runSimulation = useCallback(() => {
    setState(prev => {
      const weatherZones = generateWeatherZones(prev.scenario, prev.severity, prev.selectedCity);
      let flights = generateFlights(prev.flightCount);
      const airports = [...AIRPORTS];
      const newAlerts: Omit<ATCAlert, 'id' | 'timestamp'>[] = [];

      // Check airport closures
      const cityAirport = airports.find(a => a.code === prev.selectedCity);
      if (cityAirport && prev.scenario !== 'clear') {
        const nearbyZone = weatherZones.find(z => 
          getDistanceKm(cityAirport.position, z.center) < z.radius + 30
        );
        
        if (nearbyZone) {
          if (nearbyZone.severity === 'critical') {
            cityAirport.status = 'closed';
            cityAirport.closureReason = `Closed due to severe ${prev.scenario}`;
            newAlerts.push({
              type: 'critical',
              message: `AIRPORT CLOSURE: ${cityAirport.code} closed due to severe ${prev.scenario} conditions`,
              airportCode: cityAirport.code,
            });
          } else if (nearbyZone.severity === 'caution') {
            cityAirport.status = 'delayed';
            cityAirport.delayMinutes = Math.floor(Math.random() * 60) + 30;
            newAlerts.push({
              type: 'warning',
              message: `GROUND DELAY: ${cityAirport.code} experiencing ${cityAirport.delayMinutes}min delays`,
              airportCode: cityAirport.code,
            });
          }
        }
      }

      // Process flights
      flights = flights.map(flight => {
        const affectedZone = weatherZones.find(z => 
          z.severity !== 'safe' && isFlightInWeatherZone(flight, z)
        );

        if (affectedZone) {
          if (affectedZone.severity === 'critical') {
            // Reroute flight
            const reroutePath = generateReroutePath(flight, affectedZone);
            const extraDistance = Math.floor(Math.random() * 100) + 50;
            newAlerts.push({
              type: 'warning',
              message: `REROUTE: ${flight.callsign} deviating ${extraDistance}nm around ${prev.scenario} zone`,
              flightId: flight.id,
            });
            return {
              ...flight,
              status: 'rerouting' as const,
              currentPath: reroutePath,
              rerouted: true,
              delayMinutes: Math.floor(Math.random() * 30) + 15,
            };
          } else if (affectedZone.severity === 'caution') {
            newAlerts.push({
              type: 'info',
              message: `ADVISORY: ${flight.callsign} entering moderate ${prev.scenario} area`,
              flightId: flight.id,
            });
            return {
              ...flight,
              status: 'delayed' as const,
              delayMinutes: Math.floor(Math.random() * 20) + 5,
            };
          }
        }

        // Check if destination is closed
        const destAirport = airports.find(a => a.code === flight.destination);
        if (destAirport?.status === 'closed') {
          newAlerts.push({
            type: 'critical',
            message: `DIVERT: ${flight.callsign} diverting from ${flight.destination} - airport closed`,
            flightId: flight.id,
          });
          return {
            ...flight,
            status: 'grounded' as const,
            delayMinutes: Math.floor(Math.random() * 120) + 60,
          };
        }

        return flight;
      });

      // Add all new alerts
      const alertsToAdd = newAlerts.map(alert => ({
        ...alert,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      }));

      return {
        ...prev,
        flights,
        weatherZones,
        airports,
        alerts: [...alertsToAdd, ...prev.alerts].slice(0, 50),
        isRunning: true,
      };
    });
  }, []);

  const setScenario = useCallback((scenario: WeatherScenario) => {
    setState(prev => ({ ...prev, scenario }));
  }, []);

  const setSeverity = useCallback((severity: WeatherSeverity) => {
    setState(prev => ({ ...prev, severity }));
  }, []);

  const setSelectedCity = useCallback((selectedCity: string) => {
    setState(prev => ({ ...prev, selectedCity }));
  }, []);

  const setFlightCount = useCallback((flightCount: number) => {
    setState(prev => ({ ...prev, flightCount }));
  }, []);

  const clearAlerts = useCallback(() => {
    setState(prev => ({ ...prev, alerts: [] }));
  }, []);

  const getStats = useCallback((): SimulationStats => {
    const { flights, airports } = state;
    const reroutedFlights = flights.filter(f => f.rerouted).length;
    const delayedFlights = flights.filter(f => f.status === 'delayed').length;
    const groundedFlights = flights.filter(f => f.status === 'grounded').length;
    const totalDelay = flights.reduce((sum, f) => sum + (f.delayMinutes || 0), 0);
    const airportsClosed = airports.filter(a => a.status === 'closed').length;

    return {
      totalFlights: flights.length,
      reroutedFlights,
      delayedFlights,
      groundedFlights,
      averageDelay: flights.length > 0 ? Math.round(totalDelay / flights.length) : 0,
      totalRerouteDistance: reroutedFlights * (Math.floor(Math.random() * 50) + 30),
      airportsClosed,
    };
  }, [state]);

  return {
    state,
    runSimulation,
    setScenario,
    setSeverity,
    setSelectedCity,
    setFlightCount,
    clearAlerts,
    getStats,
  };
}
