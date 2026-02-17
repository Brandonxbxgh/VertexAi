import Link from "next/link";

export default function VerifySuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <svg
              className="h-8 w-8 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-semibold text-zinc-100">
          Email successfully verified
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Your account is ready. You can now sign in to access your dashboard.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
