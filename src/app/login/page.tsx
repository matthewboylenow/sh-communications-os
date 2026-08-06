import { redirect } from "next/navigation";
import { signIn } from "@/core/auth";
import { currentActor } from "@/core/auth/guards";
import { Medallion, Wordmark } from "@/components/mark";
import { Field } from "@/components/ui";

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
    <div className="flex min-h-dvh flex-col justify-center px-6 sm:px-10">
      <div className="w-full max-w-[24rem]">
        <div className="flex items-center gap-3">
          <Medallion size={28} className="text-accent" />
          <Wordmark size="1.5rem" />
        </div>

        <h1 className="masthead-title mt-6 border-b-2 border-rule-heavy pb-2.5">
          Communications OS
        </h1>

        <form action={login} className="mt-8 space-y-5">
          <Field label="Email">
            <input name="email" type="email" required className="input" autoComplete="email" />
          </Field>
          <Field label="Password">
            <input
              name="password"
              type="password"
              required
              className="input"
              autoComplete="current-password"
            />
          </Field>

          {error ? (
            <p className="note" data-level="error">
              <span className="note-glyph" aria-hidden="true">
                ✕
              </span>
              <span>That email and password did not match.</span>
            </p>
          ) : null}

          <button type="submit" className="btn btn-ink w-full">
            Sign in
          </button>
        </form>

        <p className="mark mt-8">The editorial record for Saint Helen communications.</p>
      </div>
    </div>
  );
}
