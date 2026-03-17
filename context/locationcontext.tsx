import React, { createContext, useContext, useState, useEffect } from "react";
import * as Location from "expo-location";
import axios from "axios";
import { Platform } from "react-native";

const BASE_URL = "https://uneconomic-bernita-frontlessly.ngrok-free.dev" // Update with your backend URL

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [wardInfo, setWardInfo] = useState(null);   // { id, name }
  const [corpInfo, setCorpInfo] = useState(null);   // { id, name }
  const [coords, setCoords] = useState(null);       // { latitude, longitude }
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState(null);

  const resolve = async () => {
    setResolving(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setError("Location permission denied"); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setCoords({ latitude: lat, longitude: lng });

      const res = await axios.post(
        `${BASE_URL}/api/geo/resolve-location/`,
        { latitude: lat, longitude: lng },
        {
          withCredentials: true,
          headers: { "ngrok-skip-browser-warning": "true" },
        }
      );

      setWardInfo(res.data.ward);
      setCorpInfo(res.data.municipal_corporation);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Could not resolve location"
      );
    } finally {
      setResolving(false);
    }
  };

  // Auto-resolve on mount
  useEffect(() => { resolve(); }, []);

  return (
    <LocationContext.Provider value={{ wardInfo, corpInfo, coords, resolving, error, resolve }}>
      {children}
    </LocationContext.Provider>
  );
}

// Hook for any screen to consume
export function useLocationContext() {
  return useContext(LocationContext);
}