import { useState, useEffect } from 'react';
import { Cloud } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  location: string;
  forecast: Array<{
    date: string;
    maxTemp: number;
    minTemp: number;
    condition: string;
    icon: string;
  }>;
}

export const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Get user location
  useEffect(() => {
    // Try to get from localStorage first
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        setLocation(JSON.parse(savedLocation));
        return;
      } catch (error) {
        console.error('Failed to parse saved location:', error);
        localStorage.removeItem('userLocation');
      }
    }

    // Otherwise use geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setLocation(loc);
          localStorage.setItem('userLocation', JSON.stringify(loc));
        },
        (error) => {
          logger.error('Geolocation error:', error);
          // Default to Sydney if geolocation fails
          const defaultLoc = { lat: -33.8688, lon: 151.2093 };
          setLocation(defaultLoc);
          localStorage.setItem('userLocation', JSON.stringify(defaultLoc));
        }
      );
    }
  }, []);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      if (!location) return;

      // Check cache (30 min)
      const cachedWeather = localStorage.getItem('weatherData');
      const cachedTime = localStorage.getItem('weatherCacheTime');

      if (cachedWeather && cachedTime) {
        const timeDiff = Date.now() - parseInt(cachedTime);
        if (timeDiff < 30 * 60 * 1000) { // 30 minutes
          try {
            setWeather(JSON.parse(cachedWeather));
            setLoading(false);
            return;
          } catch (error) {
            console.error('Failed to parse cached weather:', error);
            localStorage.removeItem('weatherData');
            localStorage.removeItem('weatherCacheTime');
          }
        }
      }

      try {
        logger.info('Fetching weather for location:', location);
        
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase.functions.invoke('get-weather', {
          body: { lat: location.lat, lon: location.lon }
        });

        if (error) {
          logger.error('Weather function error:', error);
          throw new Error(error.message || 'Failed to fetch weather');
        }

        if (!data) {
          throw new Error('No weather data returned');
        }

        logger.info('Weather data received successfully');

        const weatherData: WeatherData = {
          temp: Math.round(data.current.temp_c),
          condition: data.current.condition.text,
          icon: data.current.condition.icon,
          location: data.location.name,
          forecast: data.forecast.forecastday.map((day: any) => ({
            date: day.date,
            maxTemp: Math.round(day.day.maxtemp_c),
            minTemp: Math.round(day.day.mintemp_c),
            condition: day.day.condition.text,
            icon: day.day.condition.icon,
          })),
        };

        setWeather(weatherData);
        localStorage.setItem('weatherData', JSON.stringify(weatherData));
        localStorage.setItem('weatherCacheTime', Date.now().toString());
      } catch (error) {
        logger.error('Error fetching weather:', error);
        toast.error(`Failed to load weather: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [location]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Cloud className="h-5 w-5 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">Loading weather...</span>
      </div>
    );
  }

  if (!weather) {
    return (
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => window.location.reload()}
        className="text-muted-foreground"
      >
        <Cloud className="h-4 w-4 mr-2" />
        Retry weather
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <img src={weather.icon} alt={weather.condition} className="h-12 w-12" />
          <div className="text-left">
            <div className="text-2xl font-bold">{weather.temp}°C</div>
            <div className="text-xs text-muted-foreground">{weather.location}</div>
          </div>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>7-Day Forecast - {weather.location}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {weather.forecast.map((day, index) => (
            <Card
              key={day.date}
              className="p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    {index === 0
                      ? 'Today'
                      : new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                  </div>
                  <div className="text-sm text-muted-foreground">{day.condition}</div>
                </div>
                <div className="flex items-center gap-3">
                  <img src={day.icon} alt={day.condition} className="h-12 w-12" />
                  <div className="text-right">
                    <div className="text-lg font-bold">{day.maxTemp}°</div>
                    <div className="text-sm text-muted-foreground">{day.minTemp}°</div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          Perfect weather for photoshoots and open homes! ☀️
        </div>
      </DialogContent>
    </Dialog>
  );
};

