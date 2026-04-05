import Link from "next/link";
import { APPLICATION_STATUSES } from "@/lib/application-status";
import type { OrganizationEvent } from "@/types/organization";
import { hideCompletedEventFromDashboard } from "@/app/org/actions";

type HostedEventsListProps = {
  allEvents: OrganizationEvent[];
};

export default function HostedEventsList({ allEvents }: HostedEventsListProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">All hosted events</h2>
      <div className="mt-4 space-y-3">
        {allEvents.length > 0 ? (
          allEvents.map((event) => (
            (() => {
              const approvedCount = (event.event_applications ?? []).filter(
                (application) => application.status === APPLICATION_STATUSES.ACCEPTED
              ).length;

              return (
                <div key={event.id} className="rounded-md border border-gray-200 p-3 text-sm">
                  <p className="font-semibold text-gray-900">{event.title}</p>
                  <p className="text-gray-600">Address: {event.address || "Not specified"}</p>
                  <p className="text-gray-600">Status: {event.status}</p>
                  <p className="text-gray-600">Approved volunteers: {approvedCount} / {event.max_volunteers}</p>
                  <p className="text-gray-600">Total applications: {event.event_applications?.length ?? 0}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/org/events/${event.id}`}
                      className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900"
                    >
                      Manage event
                    </Link>

                    {event.status.toLowerCase() === "completed" ? (
                      <form action={hideCompletedEventFromDashboard}>
                        <input type="hidden" name="eventId" value={event.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900"
                        >
                          Remove from dashboard
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })()
          ))
        ) : (
          <p className="text-sm text-gray-500">No events created yet.</p>
        )}
      </div>
    </section>
  );
}
