import Link from "next/link";
import { APPLICATION_STATUSES } from "@/lib/application-status";
import type { OrganizationEvent } from "@/types/organization";

type CurrentEventsListProps = {
  currentEvents: OrganizationEvent[];
};

function getPendingCount(event: OrganizationEvent) {
  return (event.event_applications ?? []).filter((application) => {
    return (
      application.status === APPLICATION_STATUSES.APPLIED ||
      application.status === APPLICATION_STATUSES.WAITLISTED ||
      application.status === APPLICATION_STATUSES.NEEDS_SKILL_VERIFICATION
    );
  }).length;
}

export default function CurrentEventsList({ currentEvents }: CurrentEventsListProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Current events</h2>
          <p className="mt-1 text-sm text-gray-600">Open an event to review volunteers, attendance, and completion.</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {currentEvents.length > 0 ? (
          currentEvents.map((event) => {
            const approvedCount = (event.event_applications ?? []).filter(
              (application) => application.status === APPLICATION_STATUSES.ACCEPTED
            ).length;
            const pendingCount = getPendingCount(event);

            return (
              <article key={event.id} className="rounded-md border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{event.title}</p>
                    <p className="mt-1 text-sm text-gray-600">Status: {event.status}</p>
                    <p className="mt-1 text-sm text-gray-600">Address: {event.address || "Not specified"}</p>
                  </div>

                  <Link
                    href={`/org/events/${event.id}`}
                    className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
                  >
                    Manage event
                  </Link>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Approved</p>
                    <p className="mt-1 font-semibold text-gray-900">{approvedCount}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Applications</p>
                    <p className="mt-1 font-semibold text-gray-900">{pendingCount}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Capacity</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {approvedCount} / {event.max_volunteers}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="text-sm text-gray-500">No current events right now.</p>
        )}
      </div>
    </section>
  );
}