import Link from "next/link";
import { applyToEvent } from "@/app/volunteer/actions";
import { APPLICATION_STATUSES, getApplicationStatusLabel } from "@/lib/application-status";
import { cn } from "@/lib/utils";
import type { EventCard } from "@/types/volunteer";

type VolunteerEventGridProps = {
  events: EventCard[];
  isSignedIn: boolean;
  applicationStatusByEvent: Map<string, string>;
  activeEventId?: string | null;
  onSelectEvent?: (eventId: string) => void;
};

export default function VolunteerEventGrid({
  events,
  isSignedIn,
  applicationStatusByEvent,
  activeEventId,
  onSelectEvent
}: VolunteerEventGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {events.length === 0 ? (
        <p className="rounded-[1.5rem] border border-white/60 bg-white/60 p-6 text-sm leading-6 text-slate-600">
          No events found matching your criteria.
        </p>
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
            <article
              key={event.id}
              tabIndex={0}
              onClick={() => onSelectEvent?.(event.id)}
              onFocus={() => onSelectEvent?.(event.id)}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-[1.6rem] border p-5 transition duration-200",
                activeEventId === event.id ? "border-slate-900 bg-white" : "border-slate-200 bg-white"
              )}
              onMouseEnter={() => onSelectEvent?.(event.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="kicker">
                  {event.organizations ? (
                    <Link
                      href={`/organizations/${event.organizations.id}`}
                      className="underline underline-offset-4 hover:no-underline"
                      aria-label={`Open company profile for ${event.organizations.name}`}
                      title="Click the company name to open its profile"
                    >
                      {event.organizations.name}
                    </Link>
                  ) : (
                    "Independent"
                  )}
                </p>
                <span className={cn("stamp-pill rounded-[1rem] px-3 py-1.5 text-xs font-semibold", isFull && "border-rose-200 bg-rose-50 text-rose-900") }>
                  {event.hours_given} hrs
                </span>
              </div>

              {isFull ? (
                <div className="mt-3 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-center text-xs font-semibold text-rose-900">
                  This opportunity is full
                </div>
              ) : null}

              <div className={cn("mt-4 flex flex-1 flex-col", isFull && "opacity-70")}>
                <h2 className="display-font text-[1.45rem] font-semibold leading-tight text-slate-900">
                  <Link href={`/events/${event.id}`} className="hover:underline">
                    {event.title}
                  </Link>
                </h2>

                {event.tags && event.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <span key={tag} className="rounded-[1rem] border border-slate-200 bg-white/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{event.description}</p>
                <p className="mt-4 text-sm text-slate-600">Where: {event.address || "Address not specified"}</p>

                  <Link href={`/events/${event.id}`} className="mt-4 inline-flex text-sm font-semibold text-slate-900 underline decoration-2 underline-offset-4">
                  View full event details
                </Link>
              </div>

              <div className={cn("mt-5 flex items-end justify-between border-t border-slate-200 pt-4", isFull && "opacity-70")}>
                <div className="text-sm font-medium text-slate-600">
                  Volunteers:{" "}
                  <span className={isFull ? "font-bold text-rose-700" : "text-slate-900"}>
                    {spotsTaken} / {event.max_volunteers}
                  </span>
                </div>

                {isSignedIn ? (
                  <form>
                    <button
                      formAction={submitAction}
                      disabled={!canApply}
                      aria-label={`Apply to ${event.title}`}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                        canApply
                          ? "primary-action"
                          : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {buttonLabel}
                    </button>
                  </form>
                ) : (
                  <Link href="/login" className="rounded-full primary-action px-4 py-2 text-sm font-bold">
                    Log in to apply
                  </Link>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}