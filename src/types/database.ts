export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface Database {
    public: {
        Tables: {
            organizations: {
                Row: {
                    id: string;
                    name: string;
                    contact_email: string | null;
                    hosted_events: number;
                    created_at: string;
                }
                Insert: Optional<Database["public"]["Tables"]["organizations"]["Row"], "id" | "contact_email" | "hosted_events" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
            }
            volunteers: {
                Row: {
                    id: string;
                    name: string;
                    contact_email: string | null;
                    completed_hours: number;
                    completed_events: number;
                    rating: number;
                    skills: string[] | null;
                    created_at: string;
                }
                Insert: Optional<Database["public"]["Tables"]["volunteers"]["Row"], "id" | "contact_email" | "completed_hours" | "completed_events" | "rating" | "skills" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["volunteers"]["Row"]>;
            }
            events: {
                Row: {
                    id: string;
                    org_id: string;
                    title: string;
                    description: string | null;
                    hours_given: number;
                    compensation: string[] | null;
                    skills_needed: string[] | null;
                    lat: number | null;
                    lng: number | null;
                    address: string | null;
                    max_volunteers: number;
                    status: string;
                    hidden_from_org_dashboard: boolean;
                    created_at: string;
                }
                Insert: Optional<Database["public"]["Tables"]["events"]["Row"], "id" | "description" | "compensation" | "skills_needed" | "lat" | "lng" | "status" | "hidden_from_org_dashboard" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
            }
            tags: {
                Row: {
                    id: string;
                    name: string;
                    created_at: string;
                }
                Insert: Optional<Database["public"]["Tables"]["tags"]["Row"], "id" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["tags"]["Row"]>;
            }
            event_tags: {
                Row: {
                    event_id: string;
                    tag_id: string;
                }
                Insert: Database["public"]["Tables"]["event_tags"]["Row"];
                Update: Partial<Database["public"]["Tables"]["event_tags"]["Row"]>;
            }
            event_applications: {
                Row: {
                    id: string;
                    event_id: string;
                    volunteer_id: string;
                    status: string;
                    applied_at: string;
                    attended: boolean;
                    org_rating: number | null;
                }
                Insert: Optional<Database["public"]["Tables"]["event_applications"]["Row"], "id" | "status" | "applied_at" | "attended" | "org_rating">;
                Update: Partial<Database["public"]["Tables"]["event_applications"]["Row"]>;
            }
            organization_reviews: {
                Row: {
                    id: string;
                    org_id: string;
                    volunteer_id: string;
                    rating: number;
                    review_text: string | null;
                    created_at: string;
                }
                Insert: Optional<Database["public"]["Tables"]["organization_reviews"]["Row"], "id" | "review_text" | "created_at">;
                Update: Partial<Database["public"]["Tables"]["organization_reviews"]["Row"]>;
            }
        }
    }
};