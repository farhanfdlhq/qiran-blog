"use client";
import { useActionState } from "react";
import { login, type FormState } from "@/app/actions/admin";
import { PasswordInput } from "./PasswordInput";
import { validateForm } from "@/lib/validate";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form className="form" action={action} noValidate onSubmit={(e) => { if (!validateForm(e.currentTarget)) e.preventDefault(); }}>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <PasswordInput id="password" name="password" required autoComplete="current-password" />
      </div>
      {state.message ? <p className="form-msg err" role="alert">{state.message}</p> : null}
      <div><button className="btn" type="submit" disabled={pending}>{pending ? "Memeriksa…" : "Masuk"}</button></div>
      <p className="form-note">Lupa password? Minta kakak untuk membuat password baru dari menu Pengguna.</p>
    </form>
  );
}
