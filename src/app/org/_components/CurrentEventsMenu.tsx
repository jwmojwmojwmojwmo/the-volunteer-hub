import { acceptApplication, declineApplication } from "@/app/org/actions";
import {
  APPLICATION_STATUSES,
  getApplicationStatusLabel,
  isPendingOrgReviewStatus
} from "@/lib/application-status";
import type { ApplicationReview, OrganizationEvent } from "@/types/organization";

type CurrentEventsMenuProps = {
  currentEvents: OrganizationEvent[];
  applicationsByEvent: Record<string, ApplicationReview[]>;
};

export default function CurrentEventsMenu({ currentEvents, applicationsByEvent }: CurrentEventsMenuProps) {
  return (
    <details className="relative">
      <summary className="stamp-pill cursor-pointer list-none rounded-[1rem] px-4 py-2.5 text-sm font-semibold shadow-[0_10px_20px_rgba(20,33,46,0.08)]">
        Current events
      </summary>
      <div className="paper-panel-strong absolute right-0 top-full z-10 mt-3 w-80 rounded-[1.5rem] p-4 sm:p-5">
        {currentEvents.length > 0 ? (
          <div className="space-y-2">
            {currentEvents.map((event) => (
              <div key={event.id} className="rounded-[1.1rem] border border-slate-200 bg-white/80 px-3 py-3 text-xs">
                {(() => {
                  const approvedCount = (event.event_applications ?? []).filter(
                    (application) => application.status === APPLICATION_STATUSES.ACCEPTED
                  ).length;
                  return (
                    <>
                      <p className="font-semibold text-slate-800">{event.title}</p>
                      <p className="text-slate-600">Address: {event.address || "Not specified"}</p>
                      <p className="text-slate-600">Status: {event.status}</p>
                      <p className="text-slate-600">
                        Approved volunteers: {approvedCount} / {event.max_volunteers}
                      </p>
                      <p className="text-slate-600">Total applications: {event.event_applications?.length ?? 0}</p>
                    </>
                  );
                })()}

                <div className="mt-2 space-y-2">
                  {(applicationsByEvent[event.id] ?? []).length > 0 ? (
                    (applicationsByEvent[event.id] ?? []).map((application) => {
                      const volunteer = application.volunteers?.[0];
                      const volunteerSkills = volunteer?.skills ?? [];
                      const isPendingReview = isPendingOrgReviewStatus(application.status);

                      return (
                        <div key={application.id} className="rounded-[1.1rem] border border-slate-200 bg-white/80 p-3">
                          <p className="font-semibold text-slate-800">{volunteer?.name || "Volunteer"}</p>
                          <p className="text-slate-600">{volunteer?.contact_email || "No email"}</p>
                          <p className="text-slate-600">Application status: {getApplicationStatusLabel(application.status)}</p>
                          {volunteer?.contact_email ? (
                            <p>
                              <a
                                href={`mailto:${volunteer.contact_email}`}
                                className="font-semibold text-slate-900 underline decoration-2 underline-offset-4"
                                aria-label={`Email ${volunteer.name || "volunteer"}`}
                              >
                                Email volunteer
                              </a>
                            </p>
                          ) : null}

                          <details className="mt-2 rounded-[1.1rem] border border-slate-200 bg-slate-50 p-3">
                            <summary className="cursor-pointer font-semibold text-slate-800">Volunteer profile</summary>
                            <div className="mt-2 space-y-1 text-slate-600">
                              <p>Completed hours: {volunteer?.completed_hours ?? 0}</p>
                              <p>Completed events: {volunteer?.completed_events ?? 0}</p>
                              <p>Rating: {volunteer?.rating ?? 0}</p>
                              <div>
                                <p className="font-semibold text-slate-700">Skills</p>
                                {volunteerSkills.length > 0 ? (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {volunteerSkills.map((skill) => (
                                        <span key={`${application.id}-${skill}`} className="stamp-pill rounded-[0.85rem] px-2 py-1 text-[11px] text-slate-700">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p>No skills listed.</p>
                                )}
                              </div>
                            </div>
                          </details>

                          {isPendingReview ? (
                            <div className="mt-1 flex gap-1">
                              <form action={acceptApplication}>
                                <input type="hidden" name="applicationId" value={application.id} />
                                <button
                                  type="submit"
                                  aria-label={`Approve ${volunteer?.name || "volunteer"} for ${event.title}`}
                                  className="rounded-[0.9rem] primary-action px-2.5 py-1.5 text-[11px] font-semibold"
                                >
                                  Accept
                                </button>
                              </form>
                              <form action={declineApplication}>
                                <input type="hidden" name="applicationId" value={application.id} />
                                <button
                                  type="submit"
                                  aria-label={`Decline ${volunteer?.name || "volunteer"} for ${event.title}`}
                                  className="rounded-[0.9rem] secondary-action px-2.5 py-1.5 text-[11px] font-semibold"
                                >
                                  Decline
                                </button>
                              </form>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500">No applications to review.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No recruiting or ongoing events.</p>
        )}
      </div>
    </details>
  );
}
