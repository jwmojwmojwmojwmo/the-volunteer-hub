"use client";

import { divIcon } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { EventCard } from "@/types/volunteer";

type VolunteerOpportunityMapProps = {
  events: EventCard[];
  activeEventId?: string | null;
  onSelectEvent?: (eventId: string) => void;
  className?: string;
};

const DEFAULT_CENTER: [number, number] = [49.2606, -123.2460];

type LocationStatus = "idle" | "granted" | "denied" | "unsupported";

function CenterMapOnCurrentLocation({ onStatusChange }: { onStatusChange: (status: LocationStatus) => void }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (hasCenteredRef.current) {
      return;
    }
    hasCenteredRef.current = true;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onStatusChange("unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onStatusChange("granted");
        map.setView([position.coords.latitude, position.coords.longitude], Math.max(map.getZoom(), 13), {
          animate: true
        });
      },
      () => {
        onStatusChange("denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [map, onStatusChange]);

  return null;
}

function buildMarkerIcon(index: number, isActive: boolean) {
  return divIcon({
    className: "",
    html: `
      <div class="map-marker ${isActive ? "map-marker--active" : ""}" style="background:${isActive ? "#08444c" : "#0b5d66"}">
        ${index + 1}
      </div>
    `,
    iconAnchor: [17, 17],
    iconSize: [34, 34]
  });
}

export default function VolunteerOpportunityMap({ events, activeEventId, onSelectEvent, className }: VolunteerOpportunityMapProps) {
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const eventsWithLocation = events.filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lng));

  const firstEvent = eventsWithLocation[0] ?? events[0] ?? null;
  const center: [number, number] = [firstEvent?.lat ?? DEFAULT_CENTER[0], firstEvent?.lng ?? DEFAULT_CENTER[1]];

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="absolute left-16 top-4 z-[500] flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
          {eventsWithLocation.length > 0 ? `${eventsWithLocation.length} mapped` : "No mapped events"}
        </span>
        {locationStatus === "denied" ? (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
            Location blocked. Showing default area.
          </span>
        ) : null}
        {locationStatus === "unsupported" ? (
          <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
            Location unavailable in this browser.
          </span>
        ) : null}
      </div>

      <div className="h-full min-h-[26rem] overflow-hidden rounded-[1.5rem] border border-white/60 shadow-[0_30px_70px_rgba(20,33,46,0.14)] map-shell">
        <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full min-h-[26rem]">
          <CenterMapOnCurrentLocation onStatusChange={setLocationStatus} />

          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {eventsWithLocation.map((event, index) => {
            const isActive = activeEventId === event.id;

            return (
              <Marker
                key={event.id}
                position={[event.lat ?? DEFAULT_CENTER[0], event.lng ?? DEFAULT_CENTER[1]]}
                icon={buildMarkerIcon(index, isActive)}
                eventHandlers={{
                  click: () => onSelectEvent?.(event.id)
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {events.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-8 bottom-8 z-[500] rounded-2xl border border-slate-200 bg-white/92 px-4 py-3 text-sm font-semibold text-slate-700 shadow-md">
          No events yet. The map is still ready and centered to your location when permission is allowed.
        </div>
      ) : null}
    </div>
  );
}