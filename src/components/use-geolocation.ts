"use client";

import { useCallback, useState } from "react";

export type GeoStatus = "idle" | "loading" | "granted" | "denied" | "unavailable";

export interface GeoState {
  status: GeoStatus;
  coords: { lat: number; lng: number } | null;
}

// Permission-gated geolocation. Call request() (from a user gesture) to prompt.
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle", coords: null });

  const request = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setState({ status: "unavailable", coords: null });
        resolve(null);
        return;
      }
      setState((s) => ({ ...s, status: "loading" }));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setState({ status: "granted", coords });
          resolve(coords);
        },
        (err) => {
          setState({
            status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
            coords: null,
          });
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  }, []);

  return { ...state, request };
}
