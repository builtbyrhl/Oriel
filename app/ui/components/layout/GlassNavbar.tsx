"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import {
  Search,
  User,
  Menu,
  Heart,
  X,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import SearchDrawer from "./SearchDrawer";

type GlassNavbarProps = {
  variant?: "default" | "hero-dark" | "hero-bright" | "immersive";
};

const items = [
  { href: "/browse", label: "Browse" },
  { href: "/browse?type=movie", label: "Movies" },
  { href: "/browse?type=tv", label: "Series" },
  { href: "/collection", label: "Collection" },
];

function GlassNavbarInner({ variant = "default" }: GlassNavbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") ?? "";

  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-3 md:px-6">

        <nav className={`w-full max-w-7xl rounded-2xl transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.45)] ${
  variant === "hero-bright"
    ? "border-white/18 bg-black/22 backdrop-blur-[26px]"
    : variant === "hero-dark"
    ? "border-white/10 bg-white/8 backdrop-blur-3xl"
    : variant === "immersive"
    ? "border-transparent bg-transparent backdrop-blur-none shadow-none"
    : "border-white/10 bg-white/8 backdrop-blur-3xl"
}` }>

          <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6">

            <Link
              href="/browse"
              className="text-lg md:text-xl font-light tracking-[0.45em]"
            >
              ORIEL
            </Link>

            <div className="hidden md:flex items-center gap-10">

              {items.map((item) => {

                const active =
                  item.href === "/browse"
                    ? pathname === "/browse" && currentType === ""
                    : item.href === "/browse?type=movie"
                    ? pathname === "/browse" && currentType === "movie"
                    : item.href === "/browse?type=tv"
                    ? pathname === "/browse" && currentType === "tv"
                    : pathname === item.href;

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

            <div className="flex items-center gap-1 md:gap-2">

              <button
                onClick={() => setSearchOpen(true)}
                className="rounded-full p-2 transition-all duration-300 hover:bg-white/10 hover:scale-105"
              >
                <Search size={18} />
              </button>

              <Link
                href="/collection"
                className="rounded-full p-2 transition-all duration-300 hover:bg-white/10 hover:scale-105 md:hidden"
              >
                <Heart size={18} />
              </Link>

              <button
                className="rounded-full p-2 transition-all duration-300 hover:bg-white/10 hover:scale-105"
              >
                <User size={18} />
              </button>

              <button
                onClick={() => setMenuOpen(true)}
                className="rounded-full p-2 transition-all duration-300 hover:bg-white/10 hover:scale-105 md:hidden"
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


export default function GlassNavbar(props: GlassNavbarProps) {
  return (
    <Suspense fallback={null}>
      <GlassNavbarInner {...props} />
    </Suspense>
  );
}
