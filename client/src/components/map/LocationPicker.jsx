import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LocateFixed, Search, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../services/api.js';

// Custom draggable marker icon
const pickerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 36px; height: 36px;">
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        background: #0d9488;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(13, 148, 136, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 12px; height: 12px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
      </div>
    </div>
  `,
  className: 'urbanfix-picker-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// Map click and view update handler
const MapClickHandler = ({ onPositionChange }) => {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Map view repositioner
const MapCenterUpdater = ({ center }) => {
  const map = useMapEvents({});
  useEffect(() => {
    if (center) {
      map.setView(center, 16);
    }
  }, [center, map]);
  return null;
};

export const LocationPicker = ({
  lat,
  lng,
  address,
  onChange,
  className = '',
}) => {
  const [currentLat, setCurrentLat] = useState(lat || 18.5204);
  const [currentLng, setCurrentLng] = useState(lng || 73.8567);
  const [currentAddress, setCurrentAddress] = useState(address || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const markerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Reverse geocode lat/lng
  const fetchAddress = useCallback(
    async (latitude, longitude) => {
      try {
        const res = await api.get('/locations/reverse', {
          params: { lat: latitude, lng: longitude },
        });
        const addr = res.data?.data?.displayName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setCurrentAddress(addr);
        onChange({ lat: latitude, lng: longitude, address: addr });
      } catch (err) {
        const fallback = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setCurrentAddress(fallback);
        onChange({ lat: latitude, lng: longitude, address: fallback });
      }
    },
    [onChange]
  );

  // Get current device GPS location
  const detectGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        setCurrentLat(newLat);
        setCurrentLng(newLng);
        setIsGpsLoading(false);
        fetchAddress(newLat, newLng);
      },
      (err) => {
        setIsGpsLoading(false);
        let errorMsg = 'Unable to retrieve your location.';
        if (err.code === 1) errorMsg = 'Location permission denied. Please click on the map to set location.';
        if (err.code === 2) errorMsg = 'Location position unavailable. Please search or pick on map.';
        if (err.code === 3) errorMsg = 'Location request timed out. Please try again.';
        setGpsError(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [fetchAddress]);

  // Trigger GPS detection on mount if no initial coordinates
  useEffect(() => {
    if (!lat || !lng) {
      detectGps();
    }
  }, [detectGps, lat, lng]);

  // Handle address search suggestions with debounce
  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/locations/search', { params: { q: val } });
        setSuggestions(res.data?.data || []);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectSuggestion = (item) => {
    setCurrentLat(item.lat);
    setCurrentLng(item.lng);
    setCurrentAddress(item.displayName);
    setSearchQuery('');
    setSuggestions([]);
    onChange({ lat: item.lat, lng: item.lng, address: item.displayName });
  };

  // Marker drag event handler
  const handleMarkerDragEnd = () => {
    const marker = markerRef.current;
    if (marker != null) {
      const position = marker.getLatLng();
      setCurrentLat(position.lat);
      setCurrentLng(position.lng);
      fetchAddress(position.lat, position.lng);
    }
  };

  const handleMapClick = (newLat, newLng) => {
    setCurrentLat(newLat);
    setCurrentLng(newLng);
    fetchAddress(newLat, newLng);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search and GPS controls */}
      <div className="flex flex-col sm:flex-row gap-2 relative">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInput}
            placeholder="Search street, landmark, or area..."
            className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-soft"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          )}

          {/* Autocomplete suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left p-3 text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-start gap-2.5 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 text-slate-700 dark:text-slate-300">
                    {item.displayName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={detectGps}
          disabled={isGpsLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/60 shadow-soft transition-colors shrink-0"
        >
          {isGpsLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
          ) : (
            <LocateFixed className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          )}
          <span>{isGpsLoading ? 'Locating...' : 'Refresh GPS'}</span>
        </button>
      </div>

      {gpsError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Map display */}
      <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-soft">
        <MapContainer
          center={[currentLat, currentLng]}
          zoom={16}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapCenterUpdater center={[currentLat, currentLng]} />
          <MapClickHandler onPositionChange={handleMapClick} />
          <Marker
            draggable={true}
            eventHandlers={{ dragend: handleMarkerDragEnd }}
            position={[currentLat, currentLng]}
            icon={pickerIcon}
            ref={markerRef}
          />
        </MapContainer>

        <div className="absolute bottom-3 left-3 right-3 z-10 p-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-2 text-xs">
          <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
          <div className="truncate flex-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {currentAddress || 'Locating address...'}
            </span>
            <span className="ml-2 font-mono text-[10px] text-slate-500">
              ({currentLat.toFixed(5)}, {currentLng.toFixed(5)})
            </span>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        💡 Tip: Drag the pin or click anywhere on the map to pinpoint the exact defect location.
      </p>
    </div>
  );
};
