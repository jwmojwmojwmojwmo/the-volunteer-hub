import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EventForm from "./EventForm";

type NewEventPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function NewOrganizationEventPage({ searchParams }: NewEventPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-8">
        <Link href="/org/login" className="rounded-full primary-action px-4 py-2 text-sm font-semibold text-white">
          Go to organization login
        </Link>
      </main>
    );
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { data: existingTagRows } = await supabase.from("tags").select("name").order("name", { ascending: true });
  const existingTags = (existingTagRows ?? []).map((row) => row.name);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] paper-panel p-5 sm:p-7">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="kicker">Create event</p>
            <h1 className="display-font mt-1 text-3xl font-semibold text-slate-900">Create New Event</h1>
          </div>
          <Link href="/org/events" className="rounded-full secondary-action px-3 py-2 text-sm font-semibold text-slate-900">
            Back to events
          </Link>
        </div>

        {resolvedSearchParams?.error ? (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{resolvedSearchParams.error}</p>
        ) : null}

        <EventForm existingTags={existingTags} />
      </div>
    </main>
  );
}
