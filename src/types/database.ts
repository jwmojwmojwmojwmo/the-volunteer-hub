export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          tags: string[] | null
          hours_given: number | null
          skills_needed: string[] | null
          lat: number | null
          lng: number | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          tags?: string[] | null
          hours_given?: number | null
          skills_needed?: string[] | null
          lat?: number | null
          lng?: number | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          tags?: string[] | null
          hours_given?: number | null
          skills_needed?: string[] | null
          lat?: number | null
          lng?: number | null
          status?: string
          created_at?: string
        }
      }
    }
  }
}