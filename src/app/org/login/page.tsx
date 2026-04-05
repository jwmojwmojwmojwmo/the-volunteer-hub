import Link from "next/link";
import { organizationLogin, organizationSignup } from "../actions";

const errorMessages: Record<string, string> = {
  "invalid-email": "Enter a valid email address.",
  "invalid-password": "Enter your password.",
  "invalid-credentials": "Email or password is invalid.",
  "title-required": "Event title is required."
};

type OrgLoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function OrganizationLoginPage({ searchParams }: OrgLoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error] ?? resolvedSearchParams.error
    : null;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="paper-panel rounded-[1.6rem] px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/org/login" className="primary-action rounded-full px-4 py-2 text-sm font-semibold min-w-[9.5rem] text-center" aria-current="page">
              Login or Sign up
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-md paper-panel rounded-[1.75rem] p-6 sm:p-7">
          <p className="kicker">Organization access</p>
          <h1 className="display-font mt-2 text-3xl font-semibold text-slate-900">Organization login</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Manage events, attendance, and applications from your organization pages.</p>

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-800">{errorMessage}</p>
          ) : null}

          <form className="mt-6 flex flex-col gap-3">
            <input
              className="input-shell"
              name="email"
              type="email"
              placeholder="Organization email"
              required
            />
            <input
              className="input-shell"
              name="password"
              type="password"
              placeholder="Password"
              required
            />

            <div className="mt-2 flex flex-wrap gap-3">
              <button
                formAction={organizationLogin}
                className="primary-action rounded-full px-4 py-2 text-sm font-semibold"
              >
                Log In
              </button>
              <button
                formAction={organizationSignup}
                className="secondary-action rounded-full px-4 py-2 text-sm font-semibold"
              >
                Sign Up
              </button>
            </div>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            Not an organization?{" "}
            <Link href="/login" className="font-semibold text-slate-900 underline decoration-2 underline-offset-4">
              Go to volunteer login
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
