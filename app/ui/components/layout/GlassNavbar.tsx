"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, User, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import SearchDrawer from "./SearchDrawer";

const items = [
  { href: "/browse", label: "Browse" },
  { href: "/movies", label: "Movies" },
  { href: "/series", label: "Series" },
  { href: "/collection", label: "Collection" },
];

export default function GlassNavbar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-5 z-50 flex justify-center px-4">
        <nav className="w-full max-w-7xl rounded-3xl border border-white/10 bg-white/10 backdrop-blur-2xl shadow-2xl">
          <div className="flex h-16 items-center justify-between px-6">

            <Link
              href="/browse"
              className="text-xl tracking-[0.35em] font-light"
            >
              ORIEL
            </Link>

            <div className="hidden md:flex gap-8">
              {items.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative transition ${
                      active
                        ? "text-white"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {item.label}

                    {active && (
                      <span className="absolute -bottom-2 left-0 h-[2px] w-full rounded-full bg-white" />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={() => setSearchOpen(true)}
                className="rounded-full p-2 hover:bg-white/10 transition"
              >
                <Search size={18} />
              </button>

              <button
                className="rounded-full p-2 hover:bg-white/10 transition"
              >
                <User size={18} />
              </button>

              <button
                className="rounded-full p-2 hover:bg-white/10 transition md:hidden"
              >
                <Menu size={18} />
              </button>

            </div>

          </div>
        </nav>
      </header>

      <SearchDrawer
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
