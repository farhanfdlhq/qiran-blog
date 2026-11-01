"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { moderateComment } from "@/app/actions/admin";
import { useFeedback } from "@/components/Feedback";

export function ModerateButtons({ id, status }: { id: number; status: "pending" | "approved" | "spam" }) {
  const { toast, confirm } = useFeedback();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (action: string) => {
    if (action === "delete") {
      const res = await confirm({ title: "Hapus komentar ini?", body: "Komentar yang dihapus tidak bisa dikembalikan.", confirmLabel: "Hapus", danger: true });
      if (res !== "confirm") return;
    }
    setBusy(true);
    const form = new FormData();
    form.set("id", String(id));
    form.set("action", action);
    try {
      const r = await moderateComment(form);
      toast(r.message ?? "Selesai.", r.ok ? "ok" : "err");
      router.refresh();
    } catch {
      toast("Gagal. Periksa koneksi lalu coba lagi.", "err");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="btn-row">
      {status !== "approved"
        ? <button className="btn btn-small" type="button" disabled={busy} onClick={() => run("approved")}>Setujui</button>
        : <button className="btn btn-quiet btn-small" type="button" disabled={busy} onClick={() => run("pending")}>Sembunyikan</button>}
      {status !== "spam" ? <button className="btn btn-quiet btn-small" type="button" disabled={busy} onClick={() => run("spam")}>Tandai spam</button> : null}
      <button className="btn btn-danger btn-small" type="button" disabled={busy} onClick={() => run("delete")}>Hapus</button>
    </div>
  );
}
