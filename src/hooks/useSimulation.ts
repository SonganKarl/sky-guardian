import { useState, useCallback } from 'react';
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
import { AirportWeather, convertToWeatherZones } from '@/hooks/useWeatherApi';

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

function processFlightsWithWeather(
  flights: Flight[],
  weatherZones: WeatherZone[],
  airports: Airport[],
  scenario: string
): { flights: Flight[]; airports: Airport[]; alerts: Omit<ATCAlert, 'id' | 'timestamp'>[] } {
  const newAlerts: Omit<ATCAlert, 'id' | 'timestamp'>[] = [];
  const updatedAirports = [...airports];

  // Check airport closures based on weather zones
  updatedAirports.forEach(airport => {
    const nearbyZone = weatherZones.find(z => 
      getDistanceKm(airport.position, z.center) < z.radius + 30
    );
    
    if (nearbyZone) {
      if (nearbyZone.severity === 'critical') {
        airport.status = 'closed';
        airport.closureReason = `Closed due to severe ${nearbyZone.type}`;
        newAlerts.push({
          type: 'critical',
          message: `AIRPORT CLOSURE: ${airport.code} closed due to severe ${nearbyZone.type} conditions`,
          airportCode: airport.code,
        });
      } else if (nearbyZone.severity === 'caution') {
        airport.status = 'delayed';
        airport.delayMinutes = Math.floor(Math.random() * 60) + 30;
        newAlerts.push({
          type: 'warning',
          message: `GROUND DELAY: ${airport.code} experiencing ${airport.delayMinutes}min delays`,
          airportCode: airport.code,
        });
      }
    } else {
      airport.status = 'open';
      airport.closureReason = undefined;
      airport.delayMinutes = undefined;
    }
  });

  // Process flights
  const updatedFlights = flights.map(flight => {
    const affectedZone = weatherZones.find(z => 
      z.severity !== 'safe' && isFlightInWeatherZone(flight, z)
    );

    if (affectedZone) {
      if (affectedZone.severity === 'critical') {
        const reroutePath = generateReroutePath(flight, affectedZone);
        const extraDistance = Math.floor(Math.random() * 100) + 50;
        newAlerts.push({
          type: 'warning',
          message: `REROUTE: ${flight.callsign} deviating ${extraDistance}nm around ${affectedZone.type} zone`,
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
          message: `ADVISORY: ${flight.callsign} entering moderate ${affectedZone.type} area`,
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
    const destAirport = updatedAirports.find(a => a.code === flight.destination);
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

  return { flights: updatedFlights, airports: updatedAirports, alerts: newAlerts };
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

  const runSimulation = useCallback(() => {
    setState(prev => {
      const weatherZones = generateWeatherZones(prev.scenario, prev.severity, prev.selectedCity);
      const flights = generateFlights(prev.flightCount);
      const airports = AIRPORTS.map(a => ({ ...a, status: 'open' as const, closureReason: undefined, delayMinutes: undefined }));

      const result = processFlightsWithWeather(flights, weatherZones, airports, prev.scenario);

      const alertsToAdd = result.alerts.map(alert => ({
        ...alert,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      }));

      return {
        ...prev,
        flights: result.flights,
        weatherZones,
        airports: result.airports,
        alerts: [...alertsToAdd, ...prev.alerts].slice(0, 50),
        isRunning: true,
      };
    });
  }, []);

  const runSimulationWithRealWeather = useCallback((airportWeather: AirportWeather[]) => {
    setState(prev => {
      const weatherZones = convertToWeatherZones(airportWeather);
      const flights = generateFlights(prev.flightCount);
      const airports = AIRPORTS.map(a => ({ ...a, status: 'open' as const, closureReason: undefined, delayMinutes: undefined }));

      // Add weather info alerts
      const weatherInfoAlerts: Omit<ATCAlert, 'id' | 'timestamp'>[] = airportWeather
        .filter(w => w.weatherMain.toLowerCase() !== 'clear' && w.weatherMain.toLowerCase() !== 'clouds')
        .map(w => ({
          type: 'info' as const,
          message: `WEATHER: ${w.airportCode} - ${w.weatherDescription}, visibility ${w.visibility.toFixed(1)}km, wind ${Math.round(w.windSpeed * 1.944)}kts`,
          airportCode: w.airportCode,
        }));

      const result = processFlightsWithWeather(flights, weatherZones, airports, 'real');

      const allAlerts = [...weatherInfoAlerts, ...result.alerts];
      const alertsToAdd = allAlerts.map(alert => ({
        ...alert,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      }));

      return {
        ...prev,
        flights: result.flights,
        weatherZones,
        airports: result.airports,
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
    runSimulationWithRealWeather,
    setScenario,
    setSeverity,
    setSelectedCity,
    setFlightCount,
    clearAlerts,
    getStats,
  };
}
