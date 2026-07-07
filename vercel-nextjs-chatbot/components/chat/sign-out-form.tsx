import { redirect } from "next/navigation";
import Form from "next/form";

import { signOut } from "@/app/(auth)/auth";

const homePath = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;

export const SignOutForm = () => {
  return (
    <Form
      action={async () => {
        "use server";

        await signOut({ redirect: false });
        redirect(homePath);
      }}
      className="w-full"
    >
      <button
        className="w-full px-1 py-0.5 text-left text-red-500"
        type="submit"
      >
        Sign out
      </button>
    </Form>
  );
};
