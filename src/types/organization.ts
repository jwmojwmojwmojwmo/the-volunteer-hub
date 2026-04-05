export type OrganizationEventApplication = {
  id: string;
  status: string;
  volunteer_id?: string;
  volunteers?: {
    name: string;
    skills: string[] | null;
  }[] | null;
};

export type OrganizationEvent = {
  id: string;
  title: string;
  address: string | null;
  status: string;
  created_at: string;
  max_volunteers: number;
  skills_needed: string[] | null;
  event_applications: OrganizationEventApplication[];
};

export type ApplicationReview = {
  id: string;
  event_id: string;
  status: string;
  volunteers: {
    name: string;
    contact_email: string | null;
    skills: string[] | null;
    completed_hours: number;
    completed_events: number;
    rating: number;
  }[] | null;
};