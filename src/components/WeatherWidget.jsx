import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Thermometer, Wind, Droplets } from 'lucide-react';

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch weather for New Delhi (as fallback/default)
        // In a real app we'd use navigator.geolocation
        const lat = 28.6139;
        const lon = 77.2090;

        const fetchWeather = async () => {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`);
                const data = await res.json();
                setWeather({
                    temp: data.current_weather.temperature,
                    code: data.current_weather.weathercode,
                    windSpeed: data.current_weather.windspeed,
                    // Just take a sample humidity
                    humidity: data.hourly?.relativehumidity_2m?.[0] || 45
                });
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch weather", err);
                setLoading(false);
            }
        };

        fetchWeather();
        // Refresh every 30 minutes
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // WMO Weather interpretation codes
    const getWeatherDetails = (code) => {
        if (code === undefined) return { label: 'Unknown', icon: Cloud, color: '#8E8E93' };

        if (code === 0) return { label: 'Clear Sky', icon: Sun, color: '#FFD60A' };
        if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', icon: Cloud, color: '#A2A2B5' };
        if (code >= 45 && code <= 48) return { label: 'Foggy', icon: Cloud, color: '#A2A2B5' };
        if (code >= 51 && code <= 67) return { label: 'Rain', icon: CloudRain, color: '#0A84FF' };
        if (code >= 71 && code <= 77) return { label: 'Snow', icon: CloudSnow, color: '#FFF' };
        if (code >= 80 && code <= 82) return { label: 'Rain Showers', icon: CloudRain, color: '#0A84FF' };
        if (code >= 95 && code <= 99) return { label: 'Thunderstorm', icon: CloudLightning, color: '#BF5AF2' };

        return { label: 'Cloudy', icon: Cloud, color: '#A2A2B5' };
    };

    const details = getWeatherDetails(weather?.code);
    const WeatherIcon = details.icon;

    return (
        <div style={{
            background: 'var(--surface-primary)',
            borderRadius: 'var(--border-radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
            <div style={{ fontSize: '13px', color: '#8E8E93', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Current Weather • New Delhi
            </div>

            {loading ? (
                <div style={{ color: '#8E8E93', fontSize: '14px', padding: '10px 0' }}>Loading weather data...</div>
            ) : weather ? (
                <div className="weather-widget-main">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <WeatherIcon size={46} color={details.color} />
                        <div>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', lineHeight: '1' }}>
                                {Math.round(weather.temp)}°C
                            </div>
                            <div style={{ fontSize: '15px', color: '#8E8E93', marginTop: '4px' }}>
                                {details.label}
                            </div>
                        </div>
                    </div>

                    <div className="weather-widget-metrics">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#8E8E93' }}>
                            <Wind size={14} />
                            <span>{weather.windSpeed} km/h</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#8E8E93' }}>
                            <Droplets size={14} />
                            <span>{weather.humidity}% Humidity</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ color: '#8E8E93', fontSize: '14px' }}>Weather unavailable</div>
            )}
        </div>
    );
}
