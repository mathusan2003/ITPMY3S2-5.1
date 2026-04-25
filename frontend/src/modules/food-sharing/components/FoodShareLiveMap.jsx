import { useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_MAPS_URL = "https://maps.googleapis.com/maps/api/js";

const loadGoogleMaps = (apiKey) =>
  new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google.maps);
    if (!apiKey) return reject(new Error("Missing Google Maps API key"));

    const existing = document.getElementById("google-maps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google.maps));
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `${GOOGLE_MAPS_URL}?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

const FoodShareLiveMap = ({ pickup, ownerLiveLocation, collectorLiveLocation, meRole }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [mapError, setMapError] = useState("");
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const center = useMemo(() => {
    if (pickup?.lat && pickup?.lng) return { lat: pickup.lat, lng: pickup.lng };
    if (ownerLiveLocation?.lat && ownerLiveLocation?.lng) return { lat: ownerLiveLocation.lat, lng: ownerLiveLocation.lng };
    if (collectorLiveLocation?.lat && collectorLiveLocation?.lng) return { lat: collectorLiveLocation.lat, lng: collectorLiveLocation.lng };
    return null;
  }, [pickup, ownerLiveLocation, collectorLiveLocation]);

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (!mounted || !mapRef.current || !center) return;
        mapInstanceRef.current = new maps.Map(mapRef.current, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
        });
      })
      .catch((error) => {
        if (mounted) setMapError(error.message || "Google Maps unavailable");
      });

    return () => {
      mounted = false;
    };
  }, [apiKey, center]);

  useEffect(() => {
    if (!window.google?.maps || !mapInstanceRef.current) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const points = [
      pickup?.lat && pickup?.lng ? { ...pickup, title: "Pickup Point", color: "red" } : null,
      ownerLiveLocation?.lat && ownerLiveLocation?.lng ? { ...ownerLiveLocation, title: "Sharer Live", color: "green" } : null,
      collectorLiveLocation?.lat && collectorLiveLocation?.lng ? { ...collectorLiveLocation, title: "Collector Live", color: "blue" } : null,
    ].filter(Boolean);

    if (!points.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => {
      const marker = new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map: mapInstanceRef.current,
        title: point.title,
      });
      markersRef.current.push(marker);
      bounds.extend(marker.getPosition());
    });
    mapInstanceRef.current.fitBounds(bounds, 50);
  }, [pickup, ownerLiveLocation, collectorLiveLocation]);

  if (!center) {
    return <p className="wallet-empty">No location coordinates available yet.</p>;
  }

  return (
    <div className="wl-transfer-panel">
      <p className="wallet-small"><strong>Live Pickup Map</strong> ({meRole})</p>
      {mapError ? (
        <p className="wallet-error">{mapError}</p>
      ) : (
        <div ref={mapRef} style={{ width: "100%", height: 260, borderRadius: 10, border: "1px solid #e2e8f0" }} />
      )}
    </div>
  );
};

export default FoodShareLiveMap;

