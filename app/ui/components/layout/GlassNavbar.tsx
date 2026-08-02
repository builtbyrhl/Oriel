"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  User,
  Menu,
  Heart,
  X,
} from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-5 z-50 flex justify-center px-4">

        <nav className="w-full max-w-7xl rounded-3xl border border-white/10 bg-white/10 backdrop-blur-2xl shadow-2xl">

          <div className="flex h-16 items-center justify-between px-6">

            <Link
              href="/browse"
              className="text-xl font-light tracking-[0.35em]"
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

              <Link
                href="/collection"
                className="rounded-full p-2 hover:bg-white/10 transition md:hidden"
              >
                <Heart size={18} />
              </Link>

              <button
                className="rounded-full p-2 hover:bg-white/10 transition"
              >
                <User size={18} />
              </button>

              <button
                onClick={() => setMenuOpen(true)}
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

      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition ${
          menuOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        className={`fixed right-0 top-0 z-[70] h-full w-72 bg-[#090909] border-l border-white/10 transition-transform duration-300 ${
          menuOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >

        <div className="flex items-center justify-between border-b border-white/10 p-6">

          <h2 className="text-xl font-light">
            Menu
          </h2>

          <button onClick={() => setMenuOpen(false)}>
            <X />
          </button>

        </div>

        <div className="flex flex-col p-4">

          {items.map((item) => (

            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`rounded-2xl px-5 py-4 transition ${
                pathname === item.href
                  ? "bg-white text-black"
                  : "hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>

          ))}

        </div>

      </aside>

    </>
  );
}
