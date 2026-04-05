"use client";

import { divIcon } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { Circle } from "react-leaflet";
import type { EventCard } from "@/types/volunteer";

type Coordinates = { lat: number; lng: number };

export type VolunteerMapLocationStatus = "idle" | "granted" | "denied" | "unsupported";

type VolunteerOpportunityMapProps = {
  events: EventCard[];
  activeEventId?: string | null;
  onSelectEvent?: (eventId: string) => void;
  userLocation?: Coordinates | null;
  onUserLocationChange?: (location: Coordinates | null) => void;
  onLocationStatusChange?: (status: VolunteerMapLocationStatus) => void;
  className?: string;
  radiusKm?: number;
  isRadiusFilterEnabled?: boolean;
  locationRequestKey?: number;
};

const DEFAULT_CENTER: [number, number] = [49.2606, -123.2460];

function CenterMapOnCurrentLocation({
  onStatusChange,
  onLocationChange,
  locationRequestKey
}: {
  onStatusChange: (status: VolunteerMapLocationStatus) => void;
  onLocationChange?: (location: Coordinates | null) => void;
  locationRequestKey?: number;
}) {
  const map = useMap();
  const latestRequestRef = useRef<number | null>(null);

  useEffect(() => {
    const requestToken = locationRequestKey ?? 0;
    if (latestRequestRef.current === requestToken) {
      return;
    }
    latestRequestRef.current = requestToken;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onStatusChange("unsupported");
      onLocationChange?.(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onStatusChange("granted");
        onLocationChange?.({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        map.setView([position.coords.latitude, position.coords.longitude], Math.max(map.getZoom(), 13), {
          animate: true
        });
      },
      () => {
        onStatusChange("denied");
        onLocationChange?.(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [map, onStatusChange, onLocationChange, locationRequestKey]);

  return null;
}

function FocusMapOnActiveEvent({
  activeEventId,
  events
}: {
  activeEventId?: string | null;
  events: EventCard[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!activeEventId) {
      return;
    }

    const activeEvent = events.find((event) => event.id === activeEventId);
    if (!activeEvent || !Number.isFinite(activeEvent.lat) || !Number.isFinite(activeEvent.lng)) {
      return;
    }

    map.whenReady(() => {
      map.setView([activeEvent.lat as number, activeEvent.lng as number], Math.max(map.getZoom(), 13), {
        animate: false
      });
    });
  }, [activeEventId, events, map]);

  return null;
}

function buildMarkerIcon(hoursGiven: number, isActive: boolean) {
  return divIcon({
    className: "",
    html: `
      <div class="map-marker ${isActive ? "map-marker--active" : ""}" style="background:${isActive ? "#08444c" : "#0b5d66"}">
        ${hoursGiven}
      </div>
    `,
    iconAnchor: [17, 17],
    iconSize: [34, 34]
  });
}

export default function VolunteerOpportunityMap({
  events,
  activeEventId,
  onSelectEvent,
  userLocation,
  radiusKm,
  isRadiusFilterEnabled,
  locationRequestKey,
  onUserLocationChange,
  onLocationStatusChange,
  className
}: VolunteerOpportunityMapProps) {
  const [locationStatus, setLocationStatus] = useState<VolunteerMapLocationStatus>("idle");
  const eventsWithLocation = events.filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lng));

  const handleLocationStatusChange = (status: VolunteerMapLocationStatus) => {
    setLocationStatus(status);
    onLocationStatusChange?.(status);
  };

  const firstEvent = eventsWithLocation[0] ?? events[0] ?? null;
  const center: [number, number] = [firstEvent?.lat ?? DEFAULT_CENTER[0], firstEvent?.lng ?? DEFAULT_CENTER[1]];

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="absolute left-16 top-4 z-[500] flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-700 bg-slate-900/88 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow-sm">
          {eventsWithLocation.length > 0 ? `${eventsWithLocation.length} mapped` : "No mapped events"}
        </span>
        {locationStatus === "denied" ? (
          <span className="rounded-full border border-amber-900/60 bg-amber-950/55 px-3 py-1.5 text-xs font-semibold text-amber-200 shadow-sm">
            Location blocked. Showing default area.
          </span>
        ) : null}
        {locationStatus === "unsupported" ? (
          <span className="rounded-full border border-slate-700 bg-slate-900/88 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm">
            Location unavailable in this browser.
          </span>
        ) : null}
      </div>

      <div className="h-full min-h-[26rem] overflow-hidden rounded-[1.5rem] border border-white/60 shadow-[0_30px_70px_rgba(20,33,46,0.14)] map-shell">
        <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full min-h-[26rem]">
          <CenterMapOnCurrentLocation
            onStatusChange={handleLocationStatusChange}
            onLocationChange={onUserLocationChange}
            locationRequestKey={locationRequestKey}
          />
          <FocusMapOnActiveEvent activeEventId={activeEventId} events={eventsWithLocation} />

          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {userLocation ? (
            <>
              {isRadiusFilterEnabled && radiusKm ? (
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={radiusKm * 1000}
                  pathOptions={{
                    color: "#0b5d66",
                    fillColor: "#0b5d66",
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: "8 6"
                  }}
                />
              ) : null}
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={buildVolunteerLocationIcon()}
              />
            </>
          ) : null}

          {eventsWithLocation.map((event, index) => {
            const isActive = activeEventId === event.id;

            return (
              <Marker
                key={event.id}
                position={[event.lat ?? DEFAULT_CENTER[0], event.lng ?? DEFAULT_CENTER[1]]}
                icon={buildMarkerIcon(event.hours_given, isActive)}
                eventHandlers={{
                  click: () => onSelectEvent?.(event.id)
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {events.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-8 bottom-8 z-[500] rounded-2xl border border-slate-700 bg-slate-900/92 px-4 py-3 text-sm font-semibold text-slate-100 shadow-md">
          No events yet. The map is still ready and centered to your location when permission is allowed.
        </div>
      ) : null}
    </div>
  );
}

function buildVolunteerLocationIcon() {
  return divIcon({
    className: "",
    html: `
      <div style="position:relative;width:20px;height:20px;">
        <span style="position:absolute;inset:0;border-radius:999px;background:rgba(11,93,102,0.25);"></span>
        <span style="position:absolute;left:4px;top:4px;width:12px;height:12px;border-radius:999px;background:#0b5d66;border:2px solid #ffffff;box-shadow:0 0 0 2px rgba(11,93,102,0.24);"></span>
      </div>
    `,
    iconAnchor: [10, 10],
    iconSize: [20, 20]
  });
}