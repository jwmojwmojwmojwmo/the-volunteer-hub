import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrgHeaderNav from "@/app/org/_components/OrgHeaderNav";
import { updateOrganizationProfileDetails } from "@/app/org/actions";

export default async function OrganizationProfileEditPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    redirect("/org/login");
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, contact_email")
    .eq("id", user.id)
    .maybeSingle();

  if (!organization) {
    redirect("/org/profile");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="paper-panel rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <OrgHeaderNav isSignedIn />
            <Link href="/org/profile" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
              Cancel
            </Link>
          </div>
        </section>

        <section className="paper-panel-strong rounded-[2rem] p-5 sm:p-7">
          <p className="kicker">Edit organization profile</p>
          <h1 className="display-font mt-1 text-4xl font-semibold text-slate-900 sm:text-5xl">Update profile details</h1>
          <p className="mt-2 text-sm text-slate-600">Edits are isolated on this page to reduce accidental changes.</p>

          <form action={updateOrganizationProfileDetails} className="mt-6 space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-semibold text-slate-900" htmlFor="org-edit-name">
                Organization name
              </label>
              <input
                id="org-edit-name"
                name="name"
                defaultValue={organization.name}
                className="input-shell mt-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900" htmlFor="org-edit-email">
                Public contact email
              </label>
              <input
                id="org-edit-email"
                name="contactEmail"
                type="email"
                defaultValue={organization.contact_email || ""}
                className="input-shell mt-2"
                placeholder="contact@organization.org"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="submit" className="primary-action rounded-full px-4 py-2 text-sm font-semibold">
                Save changes
              </button>
              <Link href="/org/profile" className="secondary-action rounded-full px-4 py-2 text-sm font-semibold">
                Back to profile
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
