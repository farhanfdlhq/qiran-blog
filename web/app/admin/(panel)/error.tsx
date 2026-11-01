"use client";
import { useEffect } from "react";
import { ErrorView } from "@/components/ErrorView";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return <ErrorView reset={reset} digest={error.digest} inPanel />;
}
