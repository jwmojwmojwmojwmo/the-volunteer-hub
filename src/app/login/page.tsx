import { login, signup } from "./actions";

const errorMessages: Record<string, string> = {
  "invalid-email": "Enter a valid email address.",
  "invalid-password": "Enter your password.",
  "invalid-credentials": "Email or password is invalid."
};

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = resolvedSearchParams?.error
    ? errorMessages[resolvedSearchParams.error] ?? resolvedSearchParams.error
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <section className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Login</h1>
        <p className="mt-1 text-sm text-gray-600">Use your email and password.</p>

        {errorMessage ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}

        <form className="mt-6 flex flex-col gap-3">
          <input
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            name="email"
            type="email"
            placeholder="Email"
            required
          />
          <input
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            name="password"
            type="password"
            placeholder="Password"
            required
          />

          <div className="mt-2 flex gap-3">
            <button formAction={login} className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
              Log In
            </button>
            <button formAction={signup} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800">
              Sign Up
            </button>
            <button type="button" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800">
              Forgot password
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}