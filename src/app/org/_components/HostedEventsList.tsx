import Link from "next/link";
import { APPLICATION_STATUSES } from "@/lib/application-status";
import type { OrganizationEvent } from "@/types/organization";
import { hideCompletedEventFromDashboard } from "@/app/org/actions";

type HostedEventsListProps = {
  allEvents: OrganizationEvent[];
};

export default function HostedEventsList({ allEvents }: HostedEventsListProps) {
  const archivedEvents = allEvents.filter((event) => (event.status || "").toLowerCase() === "completed");

  return (
    <section className="paper-panel rounded-[1.75rem] p-5 sm:p-6">
      <p className="kicker">Archive</p>
      <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Completed events ready to archive</h2>
      <div className="mt-4 space-y-3">
        {archivedEvents.length > 0 ? (
          archivedEvents.map((event) => (
            (() => {
              const approvedCount = (event.event_applications ?? []).filter(
                (application) => application.status === APPLICATION_STATUSES.ACCEPTED
              ).length;

              return (
                <div key={event.id} className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 text-sm shadow-[0_12px_28px_rgba(20,33,46,0.06)]">
                  <p className="display-font text-xl font-semibold text-slate-900">{event.title}</p>
                  <p className="text-slate-600">Address: {event.address || "Not specified"}</p>
                  <p className="text-slate-600">Status: {event.status}</p>
                  <p className="text-slate-600">Approved volunteers: {approvedCount} / {event.max_volunteers}</p>
                  <p className="text-slate-600">Total applications: {event.event_applications?.length ?? 0}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/org/events/${event.id}`}
                      className="rounded-[1rem] secondary-action px-3 py-2.5 text-xs font-semibold"
                    >
                      Manage event
                    </Link>

                    <form action={hideCompletedEventFromDashboard}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button
                        type="submit"
                        className="rounded-[1rem] secondary-action px-3 py-2.5 text-xs font-semibold"
                      >
                        Move to archive
                      </button>
                    </form>
                  </div>
                </div>
              );
            })()
          ))
        ) : (
          <p className="text-sm text-slate-600">No completed events ready for archive yet.</p>
        )}
      </div>
    </section>
  );
}
