import { useLoadScript } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places'];

export const useGoogleMaps = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  return {
    isLoaded,
    loadError,
  };
};

export { GOOGLE_MAPS_API_KEY };
