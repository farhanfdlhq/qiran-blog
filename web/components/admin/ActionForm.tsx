"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/admin";

/** Form generik dengan pesan hasil, untuk server action yang mengembalikan FormState. */
export function ActionForm({ action, children, className = "form", resetOnOk = false }: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnOk?: boolean;
}) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form className={className} action={run} key={resetOnOk && state.ok ? state.message : undefined}>
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>{children}</fieldset>
      {state.message ? <p className={`form-msg ${state.ok ? "ok" : "err"}`} role="status">{state.message}</p> : null}
    </form>
  );
}
