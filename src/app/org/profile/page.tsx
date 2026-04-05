import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrgHeaderNav from "@/app/org/_components/OrgHeaderNav";
import { organizationSignOut } from "@/app/org/actions";
import ReloadButton from "@/components/ReloadButton";

type OrganizationProfileRow = {
  id: string;
  name: string;
  contact_email: string | null;
  hosted_events: number;
  created_at: string;
};

type OrgReview = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  volunteers: { name: string | null }[] | null;
};

export default async function OrganizationProfilePage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    redirect("/org/login");
  }

  const [{ data: organizationData }, { data: reviewsData }, { data: eventsData }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, contact_email, hosted_events, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("organization_reviews")
      .select("id, rating, review_text, created_at, volunteers(name)")
      .eq("org_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("id, status")
      .eq("org_id", user.id)
  ]);

  const organization = organizationData as OrganizationProfileRow | null;
  const reviews = (reviewsData ?? []) as OrgReview[];
  const events = (eventsData ?? []) as { id: string; status: string }[];

  if (!organization) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-8">
        <div className="paper-panel rounded-[1.75rem] p-6">
          <p className="kicker">Organization profile</p>
          <h1 className="display-font mt-2 text-3xl font-semibold text-slate-900">Profile not found</h1>
          <p className="mt-2 text-sm text-slate-600">We could not load your organization profile yet.</p>
          <Link href="/org/events" className="mt-4 inline-flex rounded-full secondary-action px-4 py-2 text-sm font-semibold">
            Back to events
          </Link>
        </div>
      </main>
    );
  }

  const currentEvents = events.filter((event) => {
    const status = event.status.toLowerCase();
    return status === "recruiting" || status === "ongoing";
  });

  const averageReviewRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : null;
  const fiveStarCount = reviews.filter((review) => review.rating >= 5).length;
  const fourStarCount = reviews.filter((review) => review.rating >= 4 && review.rating < 5).length;
  const underFourStarCount = reviews.filter((review) => review.rating < 4).length;
  const organizationInitials = organization.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "O";

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="paper-panel rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <OrgHeaderNav isSignedIn />
            <ReloadButton label="Refresh profile" />
          </div>
        </section>

        <section className="paper-panel-strong rounded-[2rem] p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
            <div className="flex h-52 items-center justify-center rounded-[1.2rem] border border-slate-300 bg-slate-100" aria-label="Default profile picture">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-500 bg-white text-2xl font-bold text-slate-700">
                {organizationInitials}
              </div>
            </div>

            <div>
              <p className="kicker">Organization profile</p>
              <h1 className="display-font mt-1 text-4xl font-semibold text-slate-900 sm:text-5xl">{organization.name}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link href="/org/profile/edit" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
                  Edit profile
                </Link>
                <form action={organizationSignOut}>
                  <button type="submit" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
                    Log out
                  </button>
                </form>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{organization.contact_email || user.email || "No email set"}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Rating</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{averageReviewRating ? `${averageReviewRating} stars` : "No ratings"}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Joined</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(organization.created_at).toLocaleDateString()}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Events hosted</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{organization.hosted_events ?? events.length}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current events</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{currentEvents.length}</p>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reviews</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{reviews.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="paper-panel rounded-[1.75rem] p-5 sm:p-6">
          <p className="kicker">Reviews</p>
          <h2 className="display-font mt-1 text-2xl font-semibold text-slate-900">Reviews summary</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
            <article className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Good benefits: {fiveStarCount}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Very good: {fourStarCount}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Needs improvement: {underFourStarCount}</p>
              <p className="mt-4 text-sm font-semibold text-slate-900">Overall: {averageReviewRating ? `${averageReviewRating} stars` : "No ratings"}</p>
            </article>

            <article className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Recent reviews</p>
              <div className="mt-3 space-y-3">
                {reviews.length > 0 ? (
                  reviews.slice(0, 6).map((review) => (
                    <div key={review.id} className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{review.volunteers?.[0]?.name || "Volunteer"}</p>
                        <p className="text-sm font-semibold text-slate-900">{review.rating} stars</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{new Date(review.created_at).toLocaleDateString()}</p>
                      <p className="mt-2 text-sm text-slate-700">{review.review_text || "No written review."}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">No reviews yet.</p>
                )}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
