"use client";

// import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/chat/auth-form";
import { SubmitButton } from "@/components/chat/submit-button";
import { toast } from "@/components/chat/toast";
// import { isPublicRegistrationEnabled } from "@/lib/constants";
import { type LoginActionState, login } from "../actions";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" }
  );

  const { update: updateSession } = useSession();

  // biome-ignore lint/correctness/useExhaustiveDependencies: router and updateSession are stable refs
  useEffect(() => {
    if (state.status === "failed") {
      toast({ type: "error", description: "Invalid credentials!" });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Failed validating your submission!",
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
      updateSession();
      router.push(callbackUrl.startsWith("/") ? callbackUrl : "/");
      router.refresh();
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="text-sm text-muted-foreground">
        Sign in to your account to continue
      </p>
      <AuthForm action={handleSubmit} defaultEmail={email}>
        <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
        {/* Sign-up UI hidden — users are created via `pnpm user:create`
        {isPublicRegistrationEnabled ? (
          <p className="text-center text-[13px] text-muted-foreground">
            {"No account? "}
            <Link
              className="text-foreground underline-offset-4 hover:underline"
              href="/register"
            >
              Sign up
            </Link>
          </p>
        ) : (
          <p className="text-center text-[13px] text-muted-foreground">
            Contact your administrator to request an account.
          </p>
        )}
        */}
      </AuthForm>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
      <LoginForm />
    </Suspense>
  );
}
