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
    <section className="paper-panel-strong rounded-[1.75rem] p-5 sm:p-6 dark:border-slate-700 dark:bg-slate-950/88">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="kicker">Active work</p>
          <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">Current events</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Open an event to review volunteers, attendance, and completion.</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {currentEvents.length > 0 ? (
          currentEvents.map((event) => {
            const approvedCount = (event.event_applications ?? []).filter(
              (application) => application.status === APPLICATION_STATUSES.ACCEPTED
            ).length;
            const pendingCount = getPendingCount(event);

            return (
              <article key={event.id} className="rounded-[1.35rem] border border-slate-200 bg-white/80 p-4 shadow-[0_12px_28px_rgba(20,33,46,0.06)] dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="display-font text-xl font-semibold text-slate-900 dark:text-slate-50">{event.title}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Status: {event.status}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Address: {event.address || "Not specified"}</p>
                  </div>

                  <Link
                    href={`/org/events/${event.id}`}
                    className="rounded-full primary-action px-4 py-2 text-sm font-semibold"
                  >
                    Manage event
                  </Link>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/70">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Approved</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{approvedCount}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/70">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Applications</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{pendingCount}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/70">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Capacity</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">
                      {approvedCount} / {event.max_volunteers}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">No current events right now.</p>
        )}
      </div>
    </section>
  );
}