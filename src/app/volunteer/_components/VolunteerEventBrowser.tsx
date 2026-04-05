"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { APPLICATION_STATUSES } from "@/lib/application-status";
import { cn } from "@/lib/utils";
import type { EventCard, VolunteerProfile } from "@/types/volunteer";
import type { VolunteerMapLocationStatus } from "./VolunteerOpportunityMap";

const VolunteerOpportunityMap = dynamic(() => import("./VolunteerOpportunityMap"), {
  ssr: false,
  loading: () => (
    <div className="paper-panel flex h-full min-h-[26rem] items-center justify-center rounded-[1.75rem] text-sm font-semibold text-slate-600">
      Loading map...
    </div>
  )
});

type SortOption = "recommended" | "alphabetical" | "most-volunteers" | "newest" | "hours-desc";

type VolunteerEventBrowserProps = {
  events: EventCard[];
  isSignedIn: boolean;
  profile: VolunteerProfile | null;
  applicationStatusByEvent: Map<string, string>;
};

type Coordinates = { lat: number; lng: number };

function getDistanceInKm(a: Coordinates, b: Coordinates) {
  const toRadians = (value: number) => value * (Math.PI / 180);
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * centralAngle;
}

function getRecommendedScore(event: EventCard, profile: VolunteerProfile | null) {
  if (!profile) {
    return 0;
  }

  const profileSkills = new Set((profile.skills ?? []).map((skill) => skill.toLowerCase()));
  const requiredSkills = (event.skills_needed ?? []).map((skill) => skill.toLowerCase());
  const matchedSkills = requiredSkills.filter((skill) => profileSkills.has(skill));
  const skillMatchScore = matchedSkills.length * 100;
  const experienceScore = Math.min(profile.completed_events, 50) * 4 + Math.min(profile.completed_hours, 200) * 0.5;
  const requirementScore = requiredSkills.length > 0 ? requiredSkills.length * 5 : 0;

  return skillMatchScore + experienceScore + requirementScore;
}

function getSortLabel(sortOption: SortOption) {
  switch (sortOption) {
    case "recommended":
      return "Recommended";
    case "alphabetical":
      return "Alphabetical";
    case "most-volunteers":
      return "Most volunteers";
    case "newest":
      return "Newest";
    case "hours-desc":
      return "Highest hours";
  }
}

function getCompensationLabel(event: EventCard) {
  if (event.compensation && event.compensation.length > 0) {
    return event.compensation[0];
  }

  return "No listed perks";
}

export default function VolunteerEventBrowser({ events, isSignedIn, profile, applicationStatusByEvent }: VolunteerEventBrowserProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("recommended");
  const [radiusKm, setRadiusKm] = useState(25);
  const [isRadiusFilterEnabled, setIsRadiusFilterEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<VolunteerMapLocationStatus>("idle");
  const [locationRequestKey, setLocationRequestKey] = useState(0);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  const allAvailableTags = useMemo(() => {
    const tags = new Set<string>();
    events.forEach((event) => event.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [events]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((currentTag) => currentTag !== tag) : [...prev, tag]));
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  const filteredEvents = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    const matchingEvents = events.filter((event) => {
      const searchableFields = [
        event.title,
        event.description,
        event.organizations?.name,
        event.address,
        ...(event.tags ?? [])
      ]
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
        .map((value) => value.toLowerCase());
      const matchesKeyword = normalizedKeyword.length === 0
        || searchableFields.some((field) => field.includes(normalizedKeyword));

      const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => event.tags.includes(tag));

      const hasCoordinates = Number.isFinite(event.lat) && Number.isFinite(event.lng);
      const eventDistance = userLocation && hasCoordinates
        ? getDistanceInKm(userLocation, { lat: event.lat as number, lng: event.lng as number })
        : null;
      const matchesRadius = !isRadiusFilterEnabled
        ? true
        : Boolean(userLocation && eventDistance !== null && eventDistance <= radiusKm);

      return matchesKeyword && matchesTags && matchesRadius;
    });

    switch (sortOption) {
      case "alphabetical":
        return [...matchingEvents].sort((a, b) => a.title.localeCompare(b.title));
      case "most-volunteers":
        return [...matchingEvents].sort((a, b) => {
          const aApproved = (a.event_applications || []).filter(
            (application) => application.status === APPLICATION_STATUSES.ACCEPTED
          ).length;
          const bApproved = (b.event_applications || []).filter(
            (application) => application.status === APPLICATION_STATUSES.ACCEPTED
          ).length;

          if (aApproved !== bApproved) {
            return bApproved - aApproved;
          }

          return a.title.localeCompare(b.title);
        });
      case "newest":
        return [...matchingEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "hours-desc":
        return [...matchingEvents].sort((a, b) => b.hours_given - a.hours_given || a.title.localeCompare(b.title));
      case "recommended":
      default:
        return [...matchingEvents].sort((a, b) => {
          const scoreDifference = getRecommendedScore(b, profile) - getRecommendedScore(a, profile);
          if (scoreDifference !== 0) {
            return scoreDifference;
          }

          return a.title.localeCompare(b.title);
        });
    }
  }, [events, keyword, selectedTags, sortOption, profile, isRadiusFilterEnabled, radiusKm, userLocation]);

  const visibleMapEvents = filteredEvents;

  useEffect(() => {
    if (filteredEvents.length === 0) {
      setActiveEventId(null);
      setIsDetailsPanelOpen(false);
      return;
    }

    const selectedStillVisible = filteredEvents.some((event) => event.id === activeEventId);
    if (!selectedStillVisible) {
      setActiveEventId(filteredEvents[0].id);
    }
  }, [activeEventId, filteredEvents]);

  const activeEvent = visibleMapEvents.find((event) => event.id === activeEventId) ?? visibleMapEvents[0] ?? null;
  const eventsWithCoordinates = visibleMapEvents.filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lng));
  const activeEventApplicationStatus = activeEvent ? applicationStatusByEvent.get(activeEvent.id) ?? null : null;
  const activeEventPerks = activeEvent?.compensation ?? [];
  const activeCompensationLabel = activeEvent ? getCompensationLabel(activeEvent) : "No listed perks";

  const openDetailsForEvent = (eventId: string) => {
    setActiveEventId(eventId);
    setIsDetailsPanelOpen(true);
  };

  return (
    <div className="relative z-10 grid h-full min-h-0 gap-4 overflow-hidden lg:grid-cols-[380px_minmax(0,1fr)] xl:gap-6">
      <aside className="paper-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="min-w-0">
            <p className="kicker">Volunteer</p>
            <h3 className="display-font mt-1 break-words text-2xl font-semibold text-slate-900">&lt;insert site name&gt;</h3>
            <p className="mt-2 text-xs text-slate-600">Choose a point on the map to load its details here.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setSelectedTags([]);
              setSortOption("recommended");
              setIsRadiusFilterEnabled(false);
              setRadiusKm(25);
            }}
            className="secondary-action rounded-full px-3 py-2 text-xs font-semibold"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-[1rem] border border-slate-200 bg-white/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Visible</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{filteredEvents.length}</p>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-white/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Mapped</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{eventsWithCoordinates.length}</p>
          </div>
          <div className="rounded-[1rem] border border-slate-200 bg-white/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Mode</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{getSortLabel(sortOption)}</p>
          </div>
        </div>

        <div className="mt-4 space-y-4 overflow-hidden pr-1">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-900" htmlFor="event-search">
              Search
            </label>
            <input
              id="event-search"
              type="text"
              placeholder="Search titles, descriptions, orgs..."
              value={keyword}
              onChange={handleKeywordChange}
              className="input-shell"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">Tags</p>
            <div className="flex flex-wrap gap-2">
              {allAvailableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    selectedTags.includes(tag)
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="sort-events" className="mb-2 block text-sm font-semibold text-slate-900">
              Sort events
            </label>
            <select
              id="sort-events"
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              className="input-shell"
            >
              <option value="recommended">{getSortLabel("recommended")}</option>
              <option value="alphabetical">{getSortLabel("alphabetical")}</option>
              <option value="most-volunteers">{getSortLabel("most-volunteers")}</option>
              <option value="hours-desc">{getSortLabel("hours-desc")}</option>
              <option value="newest">{getSortLabel("newest")}</option>
            </select>
          </div>

          <div className="rounded-[1.1rem] border border-slate-200 bg-white/80 p-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="radius-toggle" className="text-sm font-semibold text-slate-900">
                Radius filter
              </label>
              <input
                id="radius-toggle"
                type="checkbox"
                checked={isRadiusFilterEnabled}
                onChange={(event) => setIsRadiusFilterEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
            </div>

            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                <span>Search radius</span>
                <span>{radiusKm} km</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                disabled={!isRadiusFilterEnabled}
                className="w-full accent-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <p className="mt-2 text-xs text-slate-600">
              {userLocation
                ? `Using your current location (${locationStatus === "granted" ? "detected" : "updated"}).`
                : "Allow location access to filter nearby pins."}
            </p>

            <button
              type="button"
              onClick={() => setLocationRequestKey((previous) => previous + 1)}
              className="mt-3 w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-slate-500"
            >
              Enable location access
            </button>
          </div>

          {activeEvent ? (
            <article className="rounded-[1.35rem] border border-slate-200 bg-white/85 p-4 shadow-[0_16px_36px_rgba(20,33,46,0.08)]">
              <p className="kicker">Picked</p>
              <h4 className="mt-1 truncate text-lg font-semibold text-slate-900">{activeEvent.title}</h4>
              <div className="mt-3 grid grid-cols-2 gap-2 text-slate-900">
                <div className="rounded-[0.95rem] bg-emerald-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Hours</p>
                  <p className="text-base font-semibold">+{activeEvent.hours_given}h</p>
                </div>
                <div className="rounded-[0.95rem] bg-amber-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">Perk</p>
                  <p className="truncate text-sm font-semibold">{activeCompensationLabel}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsDetailsPanelOpen(true)}
                  className="inline-flex rounded-full primary-action px-4 py-2 text-sm font-semibold"
                >
                  Open details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveEventId(null);
                    setIsDetailsPanelOpen(false);
                  }}
                  className="inline-flex rounded-full secondary-action px-4 py-2 text-sm font-semibold"
                >
                  Clear
                </button>
              </div>
            </article>
          ) : (
            <div className="rounded-[1.35rem] border border-slate-200 bg-white/85 p-4 text-sm text-slate-600">
              {filteredEvents.length === 0
                ? "No events available right now."
                : "Select a marker or event to load details here."}
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">More events</p>
              <p className="text-xs text-slate-500">Click any row to move the pin focus</p>
            </div>

            {filteredEvents.length > 0 ? (
              <div className="space-y-2">
                {filteredEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openDetailsForEvent(event.id)}
                    className={cn(
                      "w-full rounded-[1rem] border px-3 py-2 text-left transition",
                      event.id === activeEventId
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white/85 text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                      <span className={cn("rounded-full px-2 py-1", event.id === activeEventId ? "bg-emerald-200 text-emerald-900" : "bg-emerald-100 text-emerald-800")}>
                        +{event.hours_given}h
                      </span>
                      <span className={cn("max-w-[60%] truncate rounded-full px-2 py-1", event.id === activeEventId ? "bg-amber-200 text-amber-900" : "bg-amber-100 text-amber-800")}>
                        {getCompensationLabel(event)}
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold">{event.title}</p>
                    <p className={cn("mt-1 truncate text-xs", event.id === activeEventId ? "text-slate-100" : "text-slate-500") }>
                      {event.organizations?.name || "Independent"}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[1rem] border border-slate-200 bg-white/80 p-3 text-sm text-slate-600">
                None
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="relative z-0 h-full min-h-0 overflow-hidden">
        <VolunteerOpportunityMap
          events={visibleMapEvents}
          activeEventId={activeEventId}
          onSelectEvent={openDetailsForEvent}
          userLocation={userLocation}
          radiusKm={radiusKm}
          isRadiusFilterEnabled={isRadiusFilterEnabled}
          locationRequestKey={locationRequestKey}
          onUserLocationChange={setUserLocation}
          onLocationStatusChange={setLocationStatus}
          className="h-full"
        />

        {activeEvent && isDetailsPanelOpen ? (
          <aside className="pointer-events-auto absolute inset-y-4 left-4 z-[700] w-[min(30rem,calc(100%-2rem))] overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/94 shadow-[0_24px_60px_rgba(20,33,46,0.24)] backdrop-blur-sm">
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <p className="kicker">Event details</p>
                  <h4 className="display-font mt-1 break-words text-2xl font-semibold text-slate-900">{activeEvent.title}</h4>
                  <p className="mt-1 break-words text-sm text-slate-600">{activeEvent.organizations?.name || "Independent"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailsPanelOpen(false)}
                  className="secondary-action shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
                >
                  Close
                </button>
              </div>

              <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="grid grid-cols-2 gap-2 text-slate-900">
                  <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Hours gained</p>
                    <p className="mt-1 text-2xl font-semibold">+{activeEvent.hours_given}h</p>
                  </div>
                  <div className="rounded-[1rem] border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Compensation</p>
                    <p className="mt-1 truncate text-sm font-semibold">{activeCompensationLabel}</p>
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-700">{activeEvent.description || "No description provided."}</p>

                <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Address</p>
                    <p className="mt-1 break-words">{activeEvent.address || "Address not specified"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Capacity</p>
                    <p className="mt-1">{activeEvent.hours_given} hours, {activeEvent.max_volunteers} volunteers</p>
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-slate-200 bg-white/85 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Posted</p>
                    <p className="mt-1">{new Date(activeEvent.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-white/85 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Your status</p>
                    <p className="mt-1">{isSignedIn ? (activeEventApplicationStatus ?? "Not applied") : "Sign in to apply"}</p>
                  </div>
                </div>

                {activeEventPerks.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">All perks</p>
                    <div className="flex flex-wrap gap-2">
                      {activeEventPerks.map((perk) => (
                        <span key={perk} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeEvent.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeEvent.tags.map((tag) => (
                      <span key={tag} className="stamp-pill rounded-full px-2.5 py-1 text-xs font-semibold text-slate-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        ) : null}
      </section>
    </div>
  );
}