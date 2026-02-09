import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeatherZone, WeatherSeverity, Position } from '@/types/simulation';

export interface AirportWeather {
  airportCode: string;
  position: { lat: number; lng: number };
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  weatherMain: string;
  weatherDescription: string;
  clouds: number;
  pressure: number;
  alerts?: {
    event: string;
    description: string;
    start: number;
    end: number;
  }[];
}

export interface WeatherApiResponse {
  timestamp: string;
  airports: AirportWeather[];
  summary: {
    hasStorms: boolean;
    hasRain: boolean;
    hasFog: boolean;
    hasStrongWinds: boolean;
    totalAlerts: number;
  };
  alerts: {
    event: string;
    description: string;
    start: number;
    end: number;
    airportCode: string;
  }[];
}

function determineWeatherSeverity(weather: AirportWeather): WeatherSeverity {
  const mainWeather = weather.weatherMain.toLowerCase();
  
  // Critical conditions
  if (
    mainWeather.includes('thunderstorm') ||
    weather.visibility < 0.5 ||
    weather.windSpeed > 20 // ~40 knots
  ) {
    return 'critical';
  }
  
  // Caution conditions
  if (
    mainWeather.includes('rain') ||
    mainWeather.includes('drizzle') ||
    weather.visibility < 3 ||
    weather.windSpeed > 10 || // ~20 knots
    weather.clouds > 80
  ) {
    return 'caution';
  }
  
  return 'safe';
}

function determineWeatherType(weather: AirportWeather): 'storm' | 'fog' | 'crosswinds' | 'clear' {
  const mainWeather = weather.weatherMain.toLowerCase();
  
  if (mainWeather.includes('thunderstorm') || mainWeather.includes('rain')) {
    return 'storm';
  }
  
  if (mainWeather.includes('fog') || mainWeather.includes('mist') || weather.visibility < 1) {
    return 'fog';
  }
  
  if (weather.windSpeed > 10) {
    return 'crosswinds';
  }
  
  return 'clear';
}

export function convertToWeatherZones(weatherData: AirportWeather[]): WeatherZone[] {
  const zones: WeatherZone[] = [];
  
  weatherData.forEach((weather, index) => {
    const severity = determineWeatherSeverity(weather);
    const type = determineWeatherType(weather);
    
    // Only create zones for non-clear weather
    if (type !== 'clear' || severity !== 'safe') {
      // Calculate radius based on severity
      const baseRadius = severity === 'critical' ? 80 : severity === 'caution' ? 50 : 30;
      
      zones.push({
        id: `zone-${weather.airportCode}-${index}`,
        center: {
          lat: weather.position.lat,
          lng: weather.position.lng,
        },
        radius: baseRadius,
        severity,
        type,
        windSpeed: Math.round(weather.windSpeed * 1.944), // Convert m/s to knots
        visibility: weather.visibility,
        precipitation: weather.humidity > 70 && type === 'storm' ? weather.humidity : 0,
      });
    }
  });
  
  return zones;
}

export function useWeatherApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherApiResponse | null>(null);

  const fetchWeather = useCallback(async (airports?: string[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-weather', {
        body: airports ? { airports } : undefined,
      });
      
      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch weather data');
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setWeatherData(data);
      return data as WeatherApiResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching weather';
      setError(message);
      console.error('Weather API error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWeatherZones = useCallback((): WeatherZone[] => {
    if (!weatherData) return [];
    return convertToWeatherZones(weatherData.airports);
  }, [weatherData]);

  return {
    loading,
    error,
    weatherData,
    fetchWeather,
    getWeatherZones,
  };
}
