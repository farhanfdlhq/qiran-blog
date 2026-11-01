import type { Metadata } from "next";
import { FeedbackProvider } from "@/components/Feedback";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Panel penulis", robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <FeedbackProvider>{children}</FeedbackProvider>;
}
