import { Airport, Flight, Position, WeatherZone, WeatherScenario, WeatherSeverity } from '@/types/simulation';

// Papua New Guinea Airports
export const AIRPORTS: Airport[] = [
  { code: 'POM', name: 'Jacksons International Airport (Port Moresby)', position: { lat: -9.4434, lng: 147.2200 }, status: 'open' },
  { code: 'LAE', name: 'Nadzab Airport (Lae)', position: { lat: -6.5698, lng: 146.7262 }, status: 'open' },
  { code: 'RAB', name: 'Tokua Airport (Rabaul)', position: { lat: -4.3404, lng: 152.3800 }, status: 'open' },
  { code: 'MAG', name: 'Madang Airport', position: { lat: -5.2071, lng: 145.7887 }, status: 'open' },
  { code: 'GKA', name: 'Goroka Airport', position: { lat: -6.0817, lng: 145.3917 }, status: 'open' },
  { code: 'WWK', name: 'Wewak Airport', position: { lat: -3.5838, lng: 143.6693 }, status: 'open' },
  { code: 'HGU', name: 'Mount Hagen Airport', position: { lat: -5.8268, lng: 144.2959 }, status: 'open' },
  { code: 'MXH', name: 'Moro Airport', position: { lat: -6.3633, lng: 143.2383 }, status: 'open' },
  { code: 'TBG', name: 'Tabubil Airport', position: { lat: -5.2786, lng: 141.2258 }, status: 'open' },
  { code: 'KVG', name: 'Kavieng Airport', position: { lat: -2.5794, lng: 150.8080 }, status: 'open' },
];

// PNG and regional airline codes
const AIRLINE_CODES = ['PX', 'CG', 'TO', 'QF', 'NF', 'FJ', 'SB', 'IE'];

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
