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

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, contact_email, hosted_events, created_at")
    .eq("id", orgId)
    .maybeSingle();

  if (!organization) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">Organization not found</h1>
          <p className="mt-2 text-sm text-gray-600">This profile may have been removed.</p>
          <Link href="/" className="mt-4 inline-flex rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
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
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
              <p className="mt-1 text-sm text-gray-600">Organization profile and volunteer reviews</p>
              <p className="mt-2 text-xs text-gray-500">Joined {new Date(organization.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <ReloadButton label="Reload profile" />
              <Link href="/" className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                Back to events
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Average rating</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {reviews.length > 0 ? `${averageRating.toFixed(1)} / 5.0` : "No ratings"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Reviews</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{reviews.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Events hosted</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{organization.hosted_events ?? events.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Current events</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{currentEvents.length}</p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-gray-200 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Contact</p>
            <p className="mt-1 text-sm text-gray-800">{organization.contact_email || "No public contact email"}</p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Current events</h2>
          <div className="mt-4 space-y-3">
            {currentEvents.length > 0 ? (
              currentEvents.map((event) => (
                <div key={event.id} className="rounded-md border border-gray-200 p-3 text-sm">
                  <p className="font-semibold text-gray-900">{event.title}</p>
                  <p className="text-gray-600">Status: {event.status}</p>
                  <p className="text-gray-600">Address: {event.address || "Not specified"}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recruiting or ongoing events right now.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Volunteer reviews</h2>
          <p className="mt-1 text-sm text-gray-600">Simple, transparent feedback from volunteers who worked with this organization.</p>

          {user ? (
            <form action={submitOrganizationReview} className="mt-4 space-y-3 rounded-lg border border-gray-200 p-4">
              <input type="hidden" name="orgId" value={organization.id} />
              <div>
                <label htmlFor="review-rating" className="block text-sm font-medium text-gray-900">Your rating</label>
                <select
                  id="review-rating"
                  name="rating"
                  defaultValue={String(myReview?.rating ?? 5)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Average</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Very poor</option>
                </select>
              </div>

              <div>
                <label htmlFor="review-text" className="block text-sm font-medium text-gray-900">Your review</label>
                <textarea
                  id="review-text"
                  name="reviewText"
                  defaultValue={myReview?.review_text || ""}
                  rows={4}
                  placeholder="What was it like volunteering here?"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
                {myReview ? "Update review" : "Submit review"}
              </button>
            </form>
          ) : (
            <div className="mt-4 rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
              <p>Sign in as a volunteer to leave a review.</p>
              <Link href="/login" className="mt-3 inline-flex rounded-md border border-gray-300 px-3 py-2 font-medium text-gray-900">
                Go to login
              </Link>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <article key={review.id} className="rounded-md border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">{review.volunteers?.[0]?.name || "Volunteer"}</p>
                    <p className="text-sm font-medium text-gray-800">{review.rating} / 5</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                  <p className="mt-3 text-sm text-gray-700">{review.review_text || "No written review."}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-gray-500">No reviews yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
