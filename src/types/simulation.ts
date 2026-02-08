export type WeatherSeverity = 'safe' | 'caution' | 'critical';
export type WeatherScenario = 'storm' | 'fog' | 'crosswinds' | 'clear';
export type FlightStatus = 'normal' | 'rerouting' | 'delayed' | 'grounded';

export interface Position {
  lat: number;
  lng: number;
}

export interface WeatherZone {
  id: string;
  center: Position;
  radius: number; // in km
  severity: WeatherSeverity;
  type: WeatherScenario;
  windSpeed?: number;
  visibility?: number;
  precipitation?: number;
}

export interface Flight {
  id: string;
  callsign: string;
  position: Position;
  altitude: number; // in feet
  speed: number; // in knots
  heading: number; // in degrees
  origin: string;
  destination: string;
  status: FlightStatus;
  originalPath?: Position[];
  currentPath?: Position[];
  rerouted?: boolean;
  delayMinutes?: number;
}

export interface Airport {
  code: string;
  name: string;
  position: Position;
  status: 'open' | 'delayed' | 'closed';
  closureReason?: string;
  delayMinutes?: number;
}

export interface ATCAlert {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'critical';
  message: string;
  flightId?: string;
  airportCode?: string;
}

export interface SimulationState {
  flights: Flight[];
  weatherZones: WeatherZone[];
  airports: Airport[];
  alerts: ATCAlert[];
  selectedCity: string;
  scenario: WeatherScenario;
  severity: WeatherSeverity;
  flightCount: number;
  isRunning: boolean;
}

export interface SimulationStats {
  totalFlights: number;
  reroutedFlights: number;
  delayedFlights: number;
  groundedFlights: number;
  averageDelay: number;
  totalRerouteDistance: number;
  airportsClosed: number;
}
