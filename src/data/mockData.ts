import { Airport, Flight, Position, WeatherZone, WeatherScenario, WeatherSeverity } from '@/types/simulation';

export const AIRPORTS: Airport[] = [
  { code: 'JFK', name: 'John F. Kennedy International', position: { lat: 40.6413, lng: -73.7781 }, status: 'open' },
  { code: 'LAX', name: 'Los Angeles International', position: { lat: 33.9425, lng: -118.4081 }, status: 'open' },
  { code: 'ORD', name: "O'Hare International", position: { lat: 41.9742, lng: -87.9073 }, status: 'open' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', position: { lat: 32.8998, lng: -97.0403 }, status: 'open' },
  { code: 'DEN', name: 'Denver International', position: { lat: 39.8561, lng: -104.6737 }, status: 'open' },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta', position: { lat: 33.6407, lng: -84.4277 }, status: 'open' },
  { code: 'SFO', name: 'San Francisco International', position: { lat: 37.6213, lng: -122.379 }, status: 'open' },
  { code: 'MIA', name: 'Miami International', position: { lat: 25.7959, lng: -80.2870 }, status: 'open' },
  { code: 'SEA', name: 'Seattle-Tacoma International', position: { lat: 47.4502, lng: -122.3088 }, status: 'open' },
  { code: 'BOS', name: 'Boston Logan International', position: { lat: 42.3656, lng: -71.0096 }, status: 'open' },
];

const AIRLINE_CODES = ['AA', 'UA', 'DL', 'SW', 'JB', 'AS', 'NK', 'F9'];

function generateCallsign(): string {
  const airline = AIRLINE_CODES[Math.floor(Math.random() * AIRLINE_CODES.length)];
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${airline}${number}`;
}

function interpolatePosition(start: Position, end: Position, progress: number): Position {
  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lng: start.lng + (end.lng - start.lng) * progress,
  };
}

function generateFlightPath(origin: Position, destination: Position): Position[] {
  const points: Position[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    points.push(interpolatePosition(origin, destination, i / steps));
  }
  return points;
}

export function generateFlights(count: number): Flight[] {
  const flights: Flight[] = [];
  
  for (let i = 0; i < count; i++) {
    const originAirport = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
    let destAirport = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
    while (destAirport.code === originAirport.code) {
      destAirport = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
    }
    
    const progress = Math.random();
    const path = generateFlightPath(originAirport.position, destAirport.position);
    const currentPosition = interpolatePosition(originAirport.position, destAirport.position, progress);
    
    // Calculate heading
    const dx = destAirport.position.lng - originAirport.position.lng;
    const dy = destAirport.position.lat - originAirport.position.lat;
    const heading = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    
    flights.push({
      id: `flight-${i}`,
      callsign: generateCallsign(),
      position: currentPosition,
      altitude: Math.floor(Math.random() * 10000) + 30000, // 30,000-40,000 ft
      speed: Math.floor(Math.random() * 100) + 450, // 450-550 knots
      heading: Math.round(heading),
      origin: originAirport.code,
      destination: destAirport.code,
      status: 'normal',
      originalPath: path,
      currentPath: path,
      rerouted: false,
      delayMinutes: 0,
    });
  }
  
  return flights;
}

export function generateWeatherZones(
  scenario: WeatherScenario,
  severity: WeatherSeverity,
  centerCity: string
): WeatherZone[] {
  const cityAirport = AIRPORTS.find(a => a.code === centerCity) || AIRPORTS[0];
  const zones: WeatherZone[] = [];
  
  if (scenario === 'clear') return zones;
  
  // Main weather zone centered on selected city
  const mainRadius = severity === 'critical' ? 150 : severity === 'caution' ? 100 : 50;
  
  zones.push({
    id: 'zone-main',
    center: {
      lat: cityAirport.position.lat + (Math.random() - 0.5) * 2,
      lng: cityAirport.position.lng + (Math.random() - 0.5) * 2,
    },
    radius: mainRadius,
    severity,
    type: scenario,
    windSpeed: scenario === 'crosswinds' ? (severity === 'critical' ? 45 : severity === 'caution' ? 30 : 20) : 10,
    visibility: scenario === 'fog' ? (severity === 'critical' ? 0.25 : severity === 'caution' ? 0.5 : 1) : 10,
    precipitation: scenario === 'storm' ? (severity === 'critical' ? 90 : severity === 'caution' ? 60 : 30) : 0,
  });
  
  // Add secondary zones for more severe scenarios
  if (severity !== 'safe') {
    const numSecondary = severity === 'critical' ? 3 : 1;
    for (let i = 0; i < numSecondary; i++) {
      const angle = (Math.PI * 2 * i) / numSecondary + Math.random() * 0.5;
      const distance = mainRadius * 0.8 + Math.random() * 50;
      
      zones.push({
        id: `zone-secondary-${i}`,
        center: {
          lat: cityAirport.position.lat + Math.sin(angle) * (distance / 111),
          lng: cityAirport.position.lng + Math.cos(angle) * (distance / (111 * Math.cos(cityAirport.position.lat * Math.PI / 180))),
        },
        radius: mainRadius * 0.5,
        severity: severity === 'critical' ? 'caution' : 'safe',
        type: scenario,
        windSpeed: scenario === 'crosswinds' ? 25 : 5,
        visibility: scenario === 'fog' ? 2 : 10,
        precipitation: scenario === 'storm' ? 40 : 0,
      });
    }
  }
  
  return zones;
}

export function getDistanceKm(pos1: Position, pos2: Position): number {
  const R = 6371; // Earth's radius in km
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
