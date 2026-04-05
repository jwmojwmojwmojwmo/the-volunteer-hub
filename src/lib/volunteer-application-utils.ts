import type { EventCard, VolunteerApplication } from "@/types/volunteer";

export type VolunteerApplicationEventMeta = {
  title: string;
  status: string;
  hours_given?: number;
};

export function buildEventMetaById(events: EventCard[]) {
  return new Map(
    events.map((event) => [
      event.id,
      {
        title: event.title,
        status: event.status,
        hours_given: event.hours_given
      }
    ])
  );
}

export function normalizeVolunteerApplications(
  applications: VolunteerApplication[],
  eventMetaById: Map<string, VolunteerApplicationEventMeta>
): VolunteerApplication[] {
  return applications.map((application) => {
    const embeddedEvent = application.events?.[0];
    const fallbackEvent = eventMetaById.get(application.event_id);

    return {
      ...application,
      events: [
        {
          title: embeddedEvent?.title || fallbackEvent?.title || "Unknown event",
          status: embeddedEvent?.status || fallbackEvent?.status || "unknown",
          hours_given: embeddedEvent?.hours_given ?? fallbackEvent?.hours_given
        }
      ]
    };
  });
}

export function splitVolunteerApplicationsByEventStatus(applications: VolunteerApplication[]) {
  const currentApplications = applications.filter((application) => {
    const eventStatus = application.events?.[0]?.status?.toLowerCase();
    return eventStatus !== "completed";
  });

  const pastApplications = applications.filter((application) => {
    const eventStatus = application.events?.[0]?.status?.toLowerCase();
    return eventStatus === "completed";
  });

  return { currentApplications, pastApplications };
}

export function getVolunteerApplicationEventTitle(application: VolunteerApplication) {
  const title = application.events?.[0]?.title;
  return title && title.trim().length > 0 ? title : `Event ${application.event_id.slice(0, 8)}`;
}

export function getVolunteerApplicationEarnedHours(application: VolunteerApplication) {
  const hoursGiven = application.events?.[0]?.hours_given ?? 0;
  return application.attended ? hoursGiven : 0;
}

export function getVolunteerApplicationEarnedHoursLabel(application: VolunteerApplication) {
  const earnedHours = getVolunteerApplicationEarnedHours(application);
  return earnedHours > 0 ? `${earnedHours} hours credited` : "Not credited";
}
