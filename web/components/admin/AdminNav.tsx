"use client";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; badge?: number };

export function AdminNav({ items }: { items: Item[] }) {
  const path = usePathname() || "";
  const active = (href: string) => (href === "/admin/" ? path === "/admin/" || path.startsWith("/admin/tulisan") : path.startsWith(href));
  return (
    <ul className="admin-nav">
      {items.map((it) => (
        <li key={it.href}>
          <a href={it.href} aria-current={active(it.href) ? "page" : undefined}>
            <span>{it.label}</span>
            {it.badge ? <span className="badge" aria-label={`${it.badge} menunggu`}>{it.badge}</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
