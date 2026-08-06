import { redirect } from "next/navigation";
import { signIn } from "@/core/auth";
import { currentActor } from "@/core/auth/guards";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (await currentActor()) redirect("/");

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      });
    } catch (err) {
      // next-auth throws a redirect on success. Rethrow it.
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
      redirect("/login?error=1");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="text-sm font-semibold text-navy-900">Saint Helen</p>
      <h1 className="mt-1 text-xl font-semibold">Communications OS</h1>

      <form action={login} className="card mt-6 space-y-4 p-6">
        <label className="block space-y-1">
          <span className="label">Email</span>
          <input name="email" type="email" required className="input" autoComplete="email" />
        </label>
        <label className="block space-y-1">
          <span className="label">Password</span>
          <input
            name="password"
            type="password"
            required
            className="input"
            autoComplete="current-password"
          />
        </label>
        {error ? (
          <p className="text-sm text-rust-600">That email and password did not match.</p>
        ) : null}
        <button type="submit" className="btn-primary w-full">
          Sign in
        </button>
      </form>
    </div>
  );
}
