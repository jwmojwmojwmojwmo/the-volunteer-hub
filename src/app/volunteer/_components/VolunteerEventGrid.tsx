import Link from "next/link";
import { applyToEvent } from "@/app/volunteer/actions";
import { APPLICATION_STATUSES, getApplicationStatusLabel } from "@/lib/application-status";
import type { EventCard } from "@/types/volunteer";

type VolunteerEventGridProps = {
  events: EventCard[];
  isSignedIn: boolean;
  applicationStatusByEvent: Map<string, string>;
};

export default function VolunteerEventGrid({
  events,
  isSignedIn,
  applicationStatusByEvent
}: VolunteerEventGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {events.length === 0 ? (
        <p className="text-gray-500">No events found matching your criteria.</p>
      ) : (
        events.map((event) => {
          const spotsTaken = (event.event_applications || []).filter(
            (application) => application.status === APPLICATION_STATUSES.ACCEPTED
          ).length;
          const spotsLeft = event.max_volunteers - spotsTaken;
          const isFull = spotsLeft <= 0;
          const submitAction = applyToEvent.bind(null, event.id);
          const myStatus = applicationStatusByEvent.get(event.id);
          const canApply = isSignedIn && (!myStatus || myStatus === APPLICATION_STATUSES.WITHDRAWN);
          const buttonLabel = myStatus === APPLICATION_STATUSES.WITHDRAWN
            ? "Apply again"
            : myStatus
              ? getApplicationStatusLabel(myStatus)
              : isFull
                ? "Join waitlist"
                : "Apply now";

          return (
            <div key={event.id} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col">
              {isFull && (
                <div className="absolute left-0 right-0 top-0 bg-red-100 py-1 text-center text-xs font-bold text-red-800">
                  EVENT FULL
                </div>
              )}

              <div className={`mt-2 flex-grow ${isFull ? "opacity-60" : ""}`}>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-600">
                  {event.organizations ? (
                    <Link href={`/organizations/${event.organizations.id}`} className="underline hover:no-underline">
                      {event.organizations.name}
                    </Link>
                  ) : (
                    "Independent"
                  )}
                </p>

                <div className="mb-2 flex items-start justify-between">
                  <h2 className="text-xl font-bold leading-tight text-gray-900">
                    <Link href={`/events/${event.id}`} className="hover:underline">
                      {event.title}
                    </Link>
                  </h2>
                  <span className="whitespace-nowrap rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                    {event.hours_given} hrs
                  </span>
                </div>

                {/* Tag Display */}
                {event.tags && event.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {event.tags.map(tag => (
                      <span key={tag} className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 uppercase tracking-wide">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mb-4 line-clamp-2 text-sm text-gray-600">{event.description}</p>
                <p className="mb-4 text-sm text-gray-600">Address: {event.address || "Not specified"}</p>

                <Link href={`/events/${event.id}`} className="mb-2 inline-flex text-sm font-medium text-gray-900 underline">
                  View full event details
                </Link>
              </div>

              <div className={`mt-auto pt-4 flex items-end justify-between border-t border-gray-100 ${isFull ? "opacity-60" : ""}`}>
                <div className="text-sm font-medium text-gray-500">
                  Volunteers:{" "}
                  <span className={isFull ? "font-bold text-red-500" : "text-gray-900"}>
                    {spotsTaken} / {event.max_volunteers}
                  </span>
                </div>

                {isSignedIn ? (
                  <form>
                    <button
                      formAction={submitAction}
                      disabled={!canApply}
                      aria-label={`Apply to ${event.title}`}
                      className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                        canApply
                          ? "bg-black text-white hover:bg-gray-800"
                          : "cursor-not-allowed bg-gray-100 text-gray-500"
                      }`}
                    >
                      {buttonLabel}
                    </button>
                  </form>
                ) : (
                  <Link href="/login" className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800">
                    Log in to apply
                  </Link>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}