import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AirportCoordinates {
  code: string;
  lat: number;
  lon: number;
}

// Papua New Guinea airports
const PNG_AIRPORTS: AirportCoordinates[] = [
  { code: 'POM', lat: -9.4434, lon: 147.2200 },
  { code: 'LAE', lat: -6.5698, lon: 146.7262 },
  { code: 'RAB', lat: -4.3404, lon: 152.3800 },
  { code: 'MAG', lat: -5.2071, lon: 145.7887 },
  { code: 'GKA', lat: -6.0817, lon: 145.3917 },
  { code: 'WWK', lat: -3.5838, lon: 143.6693 },
  { code: 'HGU', lat: -5.8268, lon: 144.2959 },
  { code: 'MXH', lat: -6.3633, lon: 143.2383 },
  { code: 'TBG', lat: -5.2786, lon: 141.2258 },
  { code: 'KVG', lat: -2.5794, lon: 150.8080 },
];

interface WeatherData {
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
  alerts?: WeatherAlert[];
}

interface WeatherAlert {
  event: string;
  description: string;
  start: number;
  end: number;
}

async function fetchWeatherForAirport(
  airport: AirportCoordinates,
  apiKey: string
): Promise<WeatherData | null> {
  try {
    // Fetch current weather
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${airport.lat}&lon=${airport.lon}&appid=${apiKey}&units=metric`;
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      console.error(`Weather API error for ${airport.code}: ${weatherResponse.status}`);
      return null;
    }
    
    const weatherData = await weatherResponse.json();
    
    // Fetch alerts (One Call API 3.0 - alerts only)
    let alerts: WeatherAlert[] = [];
    try {
      const alertsUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${airport.lat}&lon=${airport.lon}&appid=${apiKey}&exclude=minutely,hourly,daily,current`;
      const alertsResponse = await fetch(alertsUrl);
      
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        if (alertsData.alerts) {
          alerts = alertsData.alerts.map((alert: any) => ({
            event: alert.event,
            description: alert.description,
            start: alert.start,
            end: alert.end,
          }));
        }
      }
    } catch (alertError) {
      console.log(`No alerts available for ${airport.code}`);
    }
    
    return {
      airportCode: airport.code,
      position: { lat: airport.lat, lng: airport.lon },
      temperature: weatherData.main.temp,
      humidity: weatherData.main.humidity,
      windSpeed: weatherData.wind?.speed || 0,
      windDirection: weatherData.wind?.deg || 0,
      visibility: (weatherData.visibility || 10000) / 1000, // Convert to km
      weatherMain: weatherData.weather?.[0]?.main || 'Clear',
      weatherDescription: weatherData.weather?.[0]?.description || 'clear sky',
      clouds: weatherData.clouds?.all || 0,
      pressure: weatherData.main.pressure,
      alerts,
    };
  } catch (error) {
    console.error(`Error fetching weather for ${airport.code}:`, error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenWeatherMap API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for specific airports (optional)
    let targetAirports = PNG_AIRPORTS;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.airports && Array.isArray(body.airports)) {
          targetAirports = PNG_AIRPORTS.filter(a => body.airports.includes(a.code));
        }
      } catch {
        // Use default airports if no body
      }
    }

    // Fetch weather for all airports in parallel
    const weatherPromises = targetAirports.map(airport => 
      fetchWeatherForAirport(airport, apiKey)
    );
    
    const weatherResults = await Promise.all(weatherPromises);
    const validResults = weatherResults.filter((result): result is WeatherData => result !== null);

    // Calculate regional weather summary
    const hasStorms = validResults.some(w => 
      w.weatherMain.toLowerCase().includes('thunderstorm') || 
      w.weatherMain.toLowerCase().includes('storm')
    );
    const hasRain = validResults.some(w => 
      w.weatherMain.toLowerCase().includes('rain')
    );
    const hasFog = validResults.some(w => 
      w.visibility < 1 || w.weatherMain.toLowerCase().includes('fog') || w.weatherMain.toLowerCase().includes('mist')
    );
    const hasStrongWinds = validResults.some(w => w.windSpeed > 15); // m/s (~30 knots)
    
    const allAlerts = validResults.flatMap(w => 
      (w.alerts || []).map(alert => ({
        ...alert,
        airportCode: w.airportCode,
      }))
    );

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        airports: validResults,
        summary: {
          hasStorms,
          hasRain,
          hasFog,
          hasStrongWinds,
          totalAlerts: allAlerts.length,
        },
        alerts: allAlerts,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in fetch-weather function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch weather data', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
