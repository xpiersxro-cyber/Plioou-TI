/**
 * Utility functions for Client and Service Order GPS Geolocation & Navigation
 */

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  coordinatesFormatted: string; // e.g. "-23.550520, -46.633308"
}

/**
 * Builds Google Maps search/navigation URL for address or lat,lng
 */
export const getGoogleMapsUrl = (location: string | { latitude?: number; longitude?: number }): string => {
  if (typeof location === 'object') {
    if (location.latitude && location.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    }
    return 'https://maps.google.com';
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
};

/**
 * Builds Waze navigation URL for address or lat,lng
 */
export const getWazeUrl = (location: string | { latitude?: number; longitude?: number }): string => {
  if (typeof location === 'object') {
    if (location.latitude && location.longitude) {
      return `https://waze.com/ul?ll=${location.latitude},${location.longitude}&navigate=yes`;
    }
    return 'https://waze.com';
  }
  return `https://waze.com/ul?q=${encodeURIComponent(location)}&navigate=yes`;
};

/**
 * Captures current device GPS coordinates using browser Geolocation API
 */
export const captureDeviceGPS = (): Promise<GPSCoordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Navegador não possui suporte para Geolocalização GPS.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        resolve({
          latitude: lat,
          longitude: lng,
          coordinatesFormatted: `${lat}, ${lng}`,
        });
      },
      (error) => {
        let errorMsg = 'Não foi possível obter a localização GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Permissão de GPS negada pelo usuário ou navegador.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Sinal de GPS indisponível no momento.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Tempo limite esgotado ao buscar sinal de GPS.';
        }
        reject(new Error(errorMsg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};
