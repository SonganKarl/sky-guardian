import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Flight, WeatherZone, Airport } from '@/types/simulation';
import 'leaflet/dist/leaflet.css';

interface FlightMapProps {
  flights: Flight[];
  weatherZones: WeatherZone[];
  airports: Airport[];
  center: { lat: number; lng: number };
}

// Custom aircraft icon
const createAircraftIcon = (status: string, heading: number) => {
  const color = status === 'normal' ? '#00d4ff' : 
                status === 'rerouting' ? '#ff9500' : 
                status === 'delayed' ? '#ffcc00' : '#ff4444';
  
  return L.divIcon({
    className: 'aircraft-marker',
    html: `
      <div style="transform: rotate(${heading}deg); color: ${color}; filter: drop-shadow(0 0 4px ${color});">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Airport icon
const createAirportIcon = (status: string) => {
  const color = status === 'open' ? '#22c55e' : 
                status === 'delayed' ? '#eab308' : '#ef4444';
  
  return L.divIcon({
    className: 'airport-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: rgba(15, 23, 42, 0.9);
        border: 2px solid ${color};
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px ${color}40;
      ">
        <span style="color: ${color}; font-size: 10px; font-weight: bold; font-family: 'JetBrains Mono', monospace;">✈</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

function MapUpdater({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], 5);
  }, [center, map]);
  
  return null;
}

const getWeatherZoneColor = (severity: string) => {
  switch (severity) {
    case 'safe': return { fill: '#22c55e', stroke: '#16a34a' };
    case 'caution': return { fill: '#eab308', stroke: '#ca8a04' };
    case 'critical': return { fill: '#ef4444', stroke: '#dc2626' };
    default: return { fill: '#22c55e', stroke: '#16a34a' };
  }
};

export function FlightMap({ flights, weatherZones, airports, center }: FlightMapProps) {
  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={5}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapUpdater center={center} />

        {/* Weather zones */}
        {weatherZones.map(zone => {
          const colors = getWeatherZoneColor(zone.severity);
          return (
            <Circle
              key={zone.id}
              center={[zone.center.lat, zone.center.lng]}
              radius={zone.radius * 1000} // Convert km to meters
              pathOptions={{
                color: colors.stroke,
                fillColor: colors.fill,
                fillOpacity: 0.25,
                weight: 2,
                dashArray: zone.severity === 'critical' ? '5, 5' : undefined,
              }}
            >
              <Popup>
                <div className="text-sm p-2">
                  <div className="font-bold text-foreground capitalize">{zone.type} Zone</div>
                  <div className="text-muted-foreground">Severity: {zone.severity}</div>
                  {zone.windSpeed && <div>Wind: {zone.windSpeed} kts</div>}
                  {zone.visibility && <div>Visibility: {zone.visibility} mi</div>}
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* Flight paths */}
        {flights.map(flight => {
          if (!flight.currentPath || flight.currentPath.length < 2) return null;
          
          const pathColor = flight.rerouted ? '#ff9500' : '#00d4ff40';
          
          return (
            <Polyline
              key={`path-${flight.id}`}
              positions={flight.currentPath.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: pathColor,
                weight: flight.rerouted ? 2 : 1,
                dashArray: flight.rerouted ? '10, 5' : '5, 10',
                opacity: 0.6,
              }}
            />
          );
        })}

        {/* Airports */}
        {airports.map(airport => (
          <Marker
            key={airport.code}
            position={[airport.position.lat, airport.position.lng]}
            icon={createAirportIcon(airport.status)}
          >
            <Popup>
              <div className="text-sm p-2 min-w-[150px]">
                <div className="font-mono font-bold text-primary">{airport.code}</div>
                <div className="text-foreground text-xs">{airport.name}</div>
                <div className={`mt-2 text-xs font-medium capitalize ${
                  airport.status === 'open' ? 'text-weather-safe' :
                  airport.status === 'delayed' ? 'text-weather-caution' : 'text-weather-critical'
                }`}>
                  Status: {airport.status}
                </div>
                {airport.closureReason && (
                  <div className="text-xs text-muted-foreground mt-1">{airport.closureReason}</div>
                )}
                {airport.delayMinutes && airport.delayMinutes > 0 && (
                  <div className="text-xs text-weather-caution mt-1">Delay: {airport.delayMinutes} min</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Flights */}
        {flights.map(flight => (
          <Marker
            key={flight.id}
            position={[flight.position.lat, flight.position.lng]}
            icon={createAircraftIcon(flight.status, flight.heading)}
          >
            <Popup>
              <div className="text-sm p-2 min-w-[180px]">
                <div className="font-mono font-bold text-primary text-lg">{flight.callsign}</div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Route:</span>
                    <div className="font-mono">{flight.origin} → {flight.destination}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Altitude:</span>
                    <div className="font-mono">{(flight.altitude / 1000).toFixed(1)}k ft</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Speed:</span>
                    <div className="font-mono">{flight.speed} kts</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Heading:</span>
                    <div className="font-mono">{flight.heading}°</div>
                  </div>
                </div>
                <div className={`mt-2 px-2 py-1 rounded text-xs font-medium text-center capitalize ${
                  flight.status === 'normal' ? 'bg-weather-safe/20 text-weather-safe' :
                  flight.status === 'rerouting' ? 'bg-flight-reroute/20 text-flight-reroute' :
                  flight.status === 'delayed' ? 'bg-weather-caution/20 text-weather-caution' :
                  'bg-weather-critical/20 text-weather-critical'
                }`}>
                  {flight.status}
                  {flight.delayMinutes && flight.delayMinutes > 0 && ` (+${flight.delayMinutes}min)`}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map overlay legend */}
      <div className="absolute bottom-4 left-4 glass-panel p-3 rounded-lg text-xs space-y-2">
        <div className="font-medium text-foreground mb-2">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-weather-safe" />
          <span className="text-muted-foreground">Safe Zone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-weather-caution" />
          <span className="text-muted-foreground">Caution Zone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-weather-critical" />
          <span className="text-muted-foreground">Critical Zone</span>
        </div>
        <div className="h-px bg-border my-2" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-primary" />
          <span className="text-muted-foreground">Normal Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-flight-reroute" style={{ borderStyle: 'dashed' }} />
          <span className="text-muted-foreground">Rerouted</span>
        </div>
      </div>
    </div>
  );
}
