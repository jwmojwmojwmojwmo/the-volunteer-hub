import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ReloadButton from "@/components/ReloadButton";
import { submitOrganizationReview } from "./actions";

type OrganizationProfilePageProps = {
  params: Promise<{
    orgId: string;
  }>;
};

type OrgReview = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  volunteer_id: string;
  volunteers: { name: string | null }[] | null;
};

type OrgEvent = {
  id: string;
  title: string;
  status: string;
  address: string | null;
  created_at: string;
};

export default async function OrganizationProfilePage({ params }: OrganizationProfilePageProps) {
  const { orgId } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  const backHref = user?.id === orgId ? "/org/events" : "/";

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, contact_email, hosted_events, created_at")
    .eq("id", orgId)
    .maybeSingle();

  if (!organization) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-8">
        <div className="paper-panel rounded-[1.75rem] p-6">
          <p className="kicker">Organization profile</p>
          <h1 className="display-font mt-2 text-3xl font-semibold text-slate-900">Organization not found</h1>
          <p className="mt-2 text-sm text-slate-600">This profile may have been removed.</p>
          <Link href={backHref} className="mt-4 inline-flex rounded-full primary-action px-3 py-2 text-sm font-semibold text-white">
            Back to events
          </Link>
        </div>
      </main>
    );
  }

  const [{ data: eventsData }, { data: reviewsData }, { data: myReview }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, status, address, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("organization_reviews")
      .select("id, rating, review_text, created_at, volunteer_id, volunteers(name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    user
      ? supabase
          .from("organization_reviews")
          .select("id, rating, review_text")
          .eq("org_id", orgId)
          .eq("volunteer_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const events = (eventsData ?? []) as OrgEvent[];
  const reviews = (reviewsData ?? []) as OrgReview[];

  const currentEvents = events.filter((event) => {
    const status = event.status.toLowerCase();
    return status === "recruiting" || status === "ongoing";
  });

  const averageRating = reviews.length > 0
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : 0;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="paper-panel rounded-[2rem] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="kicker">Organization profile</p>
              <h1 className="display-font mt-1 text-4xl font-semibold text-slate-900">{organization.name}</h1>
              <p className="mt-2 text-sm text-slate-600">Organization profile and volunteer reviews</p>
              <p className="mt-2 text-xs text-slate-500">Joined {new Date(organization.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <ReloadButton label="Reload profile" />
              {user?.id === orgId ? (
                <Link href="/org/profile/edit" className="rounded-full primary-action px-3 py-2 text-sm font-semibold">
                  Edit profile
                </Link>
              ) : null}
              <Link href={backHref} className="rounded-full secondary-action px-3 py-2 text-sm font-semibold">
                Back to events
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[1.15rem] border border-slate-200 bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Average rating</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {reviews.length > 0 ? `${averageRating.toFixed(1)} / 5.0` : "No ratings"}
              </p>
            </div>
            <div className="rounded-[1.15rem] border border-slate-200 bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reviews</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{reviews.length}</p>
            </div>
            <div className="rounded-[1.15rem] border border-slate-200 bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Events hosted</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{organization.hosted_events ?? events.length}</p>
            </div>
            <div className="rounded-[1.15rem] border border-slate-200 bg-white/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current events</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{currentEvents.length}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.15rem] border border-slate-200 bg-white/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contact</p>
            <p className="mt-1 text-sm text-slate-800">{organization.contact_email || "No public contact email"}</p>
          </div>
        </section>

        <section className="paper-panel rounded-[1.75rem] p-5 sm:p-6">
          <p className="kicker">Activity</p>
          <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Current events</h2>
          <div className="mt-4 space-y-3">
            {currentEvents.length > 0 ? (
              currentEvents.map((event) => (
                <div key={event.id} className="rounded-[1.35rem] border border-slate-200 bg-white/80 p-3 text-sm">
                  <p className="display-font text-xl font-semibold text-slate-900">{event.title}</p>
                  <p className="text-slate-600">Status: {event.status}</p>
                  <p className="text-slate-600">Address: {event.address || "Not specified"}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">No recruiting or ongoing events right now.</p>
            )}
          </div>
        </section>

        <section className="paper-panel rounded-[1.75rem] p-5 sm:p-6">
          <p className="kicker">Reputation</p>
          <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Volunteer reviews</h2>
          <p className="mt-2 text-sm text-slate-600">Simple, transparent feedback from volunteers who worked with this organization.</p>

          {user ? (
            <form action={submitOrganizationReview} className="mt-4 space-y-3 rounded-[1.25rem] border border-slate-200 bg-white/80 p-4">
              <input type="hidden" name="orgId" value={organization.id} />
              <div>
                <label htmlFor="review-rating" className="block text-sm font-semibold text-slate-900">Your rating</label>
                <select
                  id="review-rating"
                  name="rating"
                  defaultValue={String(myReview?.rating ?? 5)}
                  className="input-shell mt-2"
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Average</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Very poor</option>
                </select>
              </div>

              <div>
                <label htmlFor="review-text" className="block text-sm font-semibold text-slate-900">Your review</label>
                <textarea
                  id="review-text"
                  name="reviewText"
                  defaultValue={myReview?.review_text || ""}
                  rows={4}
                  placeholder="What was it like volunteering here?"
                  className="input-shell mt-2 min-h-32"
                />
              </div>

              <button type="submit" className="primary-action rounded-full px-4 py-2 text-sm font-semibold">
                {myReview ? "Update review" : "Submit review"}
              </button>
            </form>
          ) : (
            <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
              <p>Sign in as a volunteer to leave a review.</p>
              <Link href="/login" className="mt-3 inline-flex rounded-full secondary-action px-3 py-2 font-semibold">
                Go to login
              </Link>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <article key={review.id} className="rounded-[1.35rem] border border-slate-200 bg-white/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="display-font text-xl font-semibold text-slate-900">{review.volunteers?.[0]?.name || "Volunteer"}</p>
                    <p className="text-sm font-semibold text-slate-800">{review.rating} / 5</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</p>
                  <p className="mt-3 text-sm text-slate-700">{review.review_text || "No written review."}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-600">No reviews yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
