"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitComment, type CommentState } from "@/app/actions/comments";

export function CommentForm({ postId }: { postId: number }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(submitComment, {});
  const [startedAt, setStartedAt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setStartedAt(Date.now()), []);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} className="comment-form" action={action}>
      <input type="hidden" name="post_id" value={postId} />
      <input type="hidden" name="started_at" value={startedAt} />
      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Jangan diisi</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="c-name">Nama</label>
        <input id="c-name" name="name" required maxLength={60} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="c-body">Komentar</label>
        <textarea id="c-body" name="body" required maxLength={2000} aria-describedby="c-note" />
      </div>
      <p className="form-note" id="c-note">Komentar tampil setelah disetujui penulis. Tidak perlu email atau akun.</p>
      {state.message ? <p className="form-msg" role="status">{state.message}</p> : null}
      <div><button className="btn" type="submit" disabled={pending}>{pending ? "Mengirim…" : "Kirim komentar"}</button></div>
    </form>
  );
}
