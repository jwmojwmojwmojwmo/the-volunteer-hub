export type EventCard = {
  id: string;
  created_at: string;
  status: string;
  title: string;
  description: string | null;
  address: string | null;
  lat?: number | null;
  lng?: number | null;
  compensation: string[] | null;
  hours_given: number;
  max_volunteers: number;
  organizations: { id: string; name: string } | null;
  skills_needed: string[] | null;
  event_applications: { id: string; status: string }[];
  tags: string[];
};

export type VolunteerProfile = {
  name: string;
  skills: string[] | null;
  completed_hours: number;
  completed_events: number;
  contact_email: string | null;
};

export type VolunteerApplication = {
  id: string;
  event_id: string;
  status: string;
  attended?: boolean;
  applied_at?: string;
  events: {
    title: string;
    status: string;
    hours_given?: number;
  }[] | null;
};