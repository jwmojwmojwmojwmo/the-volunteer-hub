"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { applyToEvent } from "@/app/volunteer/actions";
import { APPLICATION_STATUSES, getApplicationStatusLabel } from "@/lib/application-status";
import { STAMP_LABELS } from "@/lib/stamps";
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

function getSkillLabel(skill: string) {
  return STAMP_LABELS[skill as keyof typeof STAMP_LABELS] || skill;
}

export default function VolunteerEventBrowser({ events, isSignedIn, profile, applicationStatusByEvent }: VolunteerEventBrowserProps) {
  const [keyword, setKeyword] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("recommended");
  const [radiusKm, setRadiusKm] = useState(25);
  const [isRadiusFilterEnabled, setIsRadiusFilterEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<VolunteerMapLocationStatus>("idle");
  const [locationRequestKey, setLocationRequestKey] = useState(0);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

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

      const hasCoordinates = Number.isFinite(event.lat) && Number.isFinite(event.lng);
      const eventDistance = userLocation && hasCoordinates
        ? getDistanceInKm(userLocation, { lat: event.lat as number, lng: event.lng as number })
        : null;
      const matchesRadius = !isRadiusFilterEnabled
        ? true
        : Boolean(userLocation && eventDistance !== null && eventDistance <= radiusKm);

      return matchesKeyword && matchesRadius;
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
  }, [events, keyword, sortOption, profile, isRadiusFilterEnabled, radiusKm, userLocation]);

  const visibleMapEvents = filteredEvents;
  const searchResults = useMemo(() => filteredEvents.slice(0, 8), [filteredEvents]);
  const shouldShowSearchResults = isSearchFocused || keyword.trim().length > 0;

  useEffect(() => {
    if (filteredEvents.length === 0) {
      setActiveEventId(null);
      setIsDetailsPanelOpen(false);
      return;
    }

    if (!activeEventId) {
      setActiveEventId(filteredEvents[0].id);
      return;
    }

    const selectedStillVisible = filteredEvents.some((event) => event.id === activeEventId);
    if (!selectedStillVisible) {
      setActiveEventId(null);
      setIsDetailsPanelOpen(false);
    }
  }, [activeEventId, filteredEvents]);

  const activeEvent = visibleMapEvents.find((event) => event.id === activeEventId) ?? visibleMapEvents[0] ?? null;
  const eventsWithCoordinates = visibleMapEvents.filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lng));
  const activeEventApplicationStatus = activeEvent ? applicationStatusByEvent.get(activeEvent.id) ?? null : null;
  const activeEventPerks = activeEvent?.compensation ?? [];
  const activeCompensationLabel = activeEvent ? getCompensationLabel(activeEvent) : "No listed perks";
  const profileSkillSet = new Set((profile?.skills ?? []).map((skill) => skill.toLowerCase()));
  const missingRequiredSkills = activeEvent
    ? (activeEvent.skills_needed ?? []).filter((skill) => !profileSkillSet.has(skill.toLowerCase()))
    : [];
  const activeEventAcceptedCount = activeEvent
    ? (activeEvent.event_applications || []).filter((application) => application.status === APPLICATION_STATUSES.ACCEPTED).length
    : 0;
  const activeEventIsFull = activeEvent ? activeEventAcceptedCount >= activeEvent.max_volunteers : false;
  const isActiveEventRecruiting = Boolean(activeEvent && activeEvent.status.toLowerCase() === "recruiting");
  const canApplyToActiveEvent = Boolean(
    activeEvent
      && isSignedIn
      && (!activeEventApplicationStatus || activeEventApplicationStatus === APPLICATION_STATUSES.WITHDRAWN)
      && isActiveEventRecruiting
      && missingRequiredSkills.length === 0
  );
  const activeEventApplyAction = activeEvent ? applyToEvent.bind(null, activeEvent.id) : null;
  const activeEventApplyButtonLabel = activeEventApplicationStatus === APPLICATION_STATUSES.WITHDRAWN
    ? "Apply again"
    : activeEventApplicationStatus
      ? getApplicationStatusLabel(activeEventApplicationStatus)
      : activeEventIsFull
        ? "Join waitlist"
        : "Apply now";
  const activeEventApplyBlockReason = !activeEvent
    ? "Select an event to apply."
    : !isSignedIn
      ? "Sign in to apply."
      : activeEventApplicationStatus && activeEventApplicationStatus !== APPLICATION_STATUSES.WITHDRAWN
        ? `Application status: ${getApplicationStatusLabel(activeEventApplicationStatus)}.`
        : !isActiveEventRecruiting
          ? "Applications are closed for this event."
          : missingRequiredSkills.length > 0
            ? `Missing required skills: ${missingRequiredSkills.map((skill) => STAMP_LABELS[skill as keyof typeof STAMP_LABELS] || skill).join(", ")}.`
            : null;

  const openDetailsForEvent = (eventId: string) => {
    setActiveEventId(eventId);
    setIsDetailsPanelOpen(true);
  };

  const handleReset = () => {
    setKeyword("");
    setSortOption("recommended");
    setIsRadiusFilterEnabled(false);
    setRadiusKm(25);
    setUserLocation(null);
    setLocationStatus("idle");
    setActiveEventId(null);
    setIsDetailsPanelOpen(false);
    setIsSearchFocused(false);
  };

  return (
    <div className="relative z-10 grid h-full min-h-0 gap-4 overflow-hidden lg:grid-cols-[380px_minmax(0,1fr)] xl:gap-6">
      <aside className="paper-panel-strong flex h-full min-h-0 flex-col overflow-visible rounded-[1.75rem] p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-950/88">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
          <div className="min-w-0">
            <p className="kicker">Opportunities</p>
            <h3 className="display-font mt-1 break-words text-2xl font-semibold text-slate-900 dark:text-slate-50">Browse events</h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Use search, filters, or the map to find opportunities.</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="secondary-action rounded-full px-3 py-2 text-xs font-semibold"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 space-y-4 overflow-visible pr-1">
          <div className="relative overflow-visible">
            <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-50" htmlFor="event-search">
              Search
            </label>
            <input
              id="event-search"
              type="text"
              placeholder="Search titles, descriptions, orgs..."
              value={keyword}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={handleKeywordChange}
              className="input-shell"
            />
            <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">Click the search field to start viewing results.</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">Search by title, description, tags, skills, address, or organization.</p>

            {shouldShowSearchResults ? (
              <div className="mt-3 rounded-[1.2rem] border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/92">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Search results</p>
                </div>

                <div className="mt-3 max-h-[18rem] space-y-2 overflow-y-auto pr-1">
                  {searchResults.length > 0 ? (
                    searchResults.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onMouseDown={(mouseEvent) => {
                          mouseEvent.preventDefault();
                          openDetailsForEvent(event.id);
                        }}
                        onClick={() => openDetailsForEvent(event.id)}
                        className={cn(
                          "w-full rounded-[1rem] border px-3 py-2 text-left transition",
                          event.id === activeEventId
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                        )}
                      >
                        <p className="truncate text-sm font-semibold">{event.title}</p>
                        <p className={cn("mt-1 truncate text-xs", event.id === activeEventId ? "text-slate-100" : "text-slate-500 dark:text-slate-300") }>
                          {event.organizations?.name || "Independent"} • {event.hours_given}h
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                      No matches for your search.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <label htmlFor="sort-events" className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-50">
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
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">The current sort order also drives the search suggestions and the event list below.</p>
          </div>

          <div className="rounded-[1.1rem] border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/75">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="radius-toggle" className="text-sm font-semibold text-slate-900 dark:text-slate-50">
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
              <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
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

            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {userLocation
                ? `Using your current location (${locationStatus === "granted" ? "detected" : "updated"}).`
                : "Allow location access to filter nearby pins."}
            </p>

            <button
              type="button"
              onClick={() => setLocationRequestKey((previous) => previous + 1)}
              className="mt-3 w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-slate-500 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:hover:border-slate-500"
            >
              Enable location access
            </button>
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
          <aside className="pointer-events-auto absolute inset-y-4 left-4 z-[1200] w-[min(30rem,calc(100%-2rem))] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="kicker">Event details</p>
                  <h4 className="display-font mt-1 break-words text-2xl font-semibold text-slate-900 dark:text-slate-50">{activeEvent.title}</h4>
                  {activeEvent.organizations?.id ? (
                    <>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Company profile</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Click the company name to open its profile page.</p>
                      <Link
                        href={`/organizations/${activeEvent.organizations.id}`}
                        className="mt-2 inline-flex max-w-full break-words text-sm font-semibold text-slate-700 underline decoration-2 underline-offset-4 transition hover:text-slate-900 dark:text-slate-200 dark:hover:text-slate-50"
                        aria-label={`Open company profile for ${activeEvent.organizations.name || "organization"}`}
                      >
                        {activeEvent.organizations.name || "Organization"}
                      </Link>
                    </>
                  ) : (
                    <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">Independent</p>
                  )}
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
                <div className="grid grid-cols-2 gap-2 text-slate-900 dark:text-slate-50">
                  <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/55">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Hours gained</p>
                    <p className="mt-1 text-2xl font-semibold">+{activeEvent.hours_given}h</p>
                  </div>
                  <div className="rounded-[1rem] border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/55">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Compensation</p>
                    <p className="mt-1 truncate text-sm font-semibold">{activeCompensationLabel}</p>
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{activeEvent.description || "No description provided."}</p>

                <div className="grid gap-2 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Address</p>
                    <p className="mt-1 break-words">{activeEvent.address || "Address not specified"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Capacity</p>
                    <p className="mt-1">{activeEventAcceptedCount} / {activeEvent.max_volunteers} volunteers accepted</p>
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Posted</p>
                    <p className="mt-1">{new Date(activeEvent.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Your status</p>
                    <p className="mt-1">{isSignedIn ? (activeEventApplicationStatus ?? "Not applied") : "Sign in to apply"}</p>
                  </div>
                </div>

                <div className="rounded-[1rem] border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Application</p>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Open spots: {Math.max(activeEvent.max_volunteers - activeEventAcceptedCount, 0)}</p>
                  </div>

                  {isSignedIn ? (
                    <form className="mt-3">
                      <button
                        formAction={activeEventApplyAction ?? undefined}
                        disabled={!canApplyToActiveEvent}
                        className={cn(
                          "w-full rounded-full px-4 py-2 text-sm font-semibold transition",
                          canApplyToActiveEvent
                            ? "primary-action"
                            : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {activeEventApplyButtonLabel}
                      </button>
                    </form>
                  ) : (
                    <Link href="/login" className="mt-3 inline-flex w-full justify-center rounded-full primary-action px-4 py-2 text-sm font-semibold">
                      Log in to apply
                    </Link>
                  )}

                  {activeEventApplyBlockReason ? (
                    <p className="mt-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                      {activeEventApplyBlockReason}
                    </p>
                  ) : null}
                </div>

                {activeEventPerks.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">All perks</p>
                    <div className="flex flex-wrap gap-2">
                      {activeEventPerks.map((perk) => (
                        <span key={perk} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/55 dark:text-amber-200">
                          {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-slate-200 bg-white/85 p-3 dark:border-slate-700 dark:bg-slate-900/75">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Requested skills</p>
                    {activeEvent.skills_needed && activeEvent.skills_needed.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeEvent.skills_needed.map((skill) => (
                          <span key={skill} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                            {getSkillLabel(skill)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">No specific skills listed.</p>
                    )}
                  </div>

                  <div className="rounded-[1rem] border border-slate-200 bg-white/85 p-3 dark:border-slate-700 dark:bg-slate-900/75">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Tags</p>
                    {activeEvent.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeEvent.tags.map((tag) => (
                          <span key={tag} className="stamp-pill rounded-full px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">No tags listed.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </aside>
        ) : null}
      </section>
    </div>
  );
}