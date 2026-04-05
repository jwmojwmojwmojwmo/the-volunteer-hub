import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VolunteerHeaderMenus from "@/app/volunteer/_components/VolunteerHeaderMenus";
import ReloadButton from "@/components/ReloadButton";
import { updateVolunteerProfileDetails } from "@/app/volunteer/actions";

export default async function VolunteerProfileEditPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    redirect("/login");
  }

  const { data: volunteer } = await supabase
    .from("volunteers")
    .select("id, name, contact_email")
    .eq("id", user.id)
    .maybeSingle();

  if (!volunteer) {
    redirect("/volunteer/profile");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="paper-panel rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <VolunteerHeaderMenus isSignedIn={Boolean(user)} />
            <ReloadButton label="Refresh" />
          </div>
        </section>

        <section className="paper-panel-strong rounded-[2rem] p-5 sm:p-7">
          <p className="kicker">Edit volunteer profile</p>
          <h1 className="display-font mt-1 text-4xl font-semibold text-slate-900 sm:text-5xl">Update profile details</h1>
          <p className="mt-2 text-sm text-slate-600">Edits are isolated on this page to reduce accidental changes.</p>

          <form action={updateVolunteerProfileDetails} className="mt-6 space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-semibold text-slate-900" htmlFor="volunteer-edit-name">
                Full name
              </label>
              <input
                id="volunteer-edit-name"
                name="name"
                defaultValue={volunteer.name}
                className="input-shell mt-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900" htmlFor="volunteer-edit-email">
                Contact email
              </label>
              <input
                id="volunteer-edit-email"
                name="contactEmail"
                type="email"
                defaultValue={volunteer.contact_email || user.email || ""}
                className="input-shell mt-2"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="submit" className="primary-action rounded-full px-4 py-2 text-sm font-semibold">
                Save changes
              </button>
              <Link href="/volunteer/profile" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
