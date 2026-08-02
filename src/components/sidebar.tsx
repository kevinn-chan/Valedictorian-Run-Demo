import Link from "next/link";
import { BookOpen, LayoutGrid, Layers, LogOut, Search } from "lucide-react";
import { NavLink } from "./nav-link";

type SessionRow = { id: string; title: string; cards: number; due: number };

const ITEM =
  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";
const ITEM_ACTIVE = "bg-primary text-primary-foreground shadow-sm";
const ITEM_IDLE = "text-foreground/70 hover:bg-secondary hover:text-foreground";

const SECTION =
  "px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";

// Persistent left rail: the app's spine. Always shows where you are and what's
// due, so no screen is a dead end. Hidden below `lg` — mobile gets `MobileBar`.
export function Sidebar({
  sessions,
  dueCount,
  profileName,
}: {
  sessions: SessionRow[];
  dueCount: number;
  profileName: string | null;
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-6">
        <Link
          href="/"
          prefetch={false}
          className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="size-4" />
          </span>
          Valedictorian
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <p className={SECTION}>Overview</p>
        <div className="space-y-1">
          <NavLink
            href="/"
            exact
            className={ITEM}
            activeClassName={ITEM_ACTIVE}
            idleClassName={ITEM_IDLE}
          >
            <LayoutGrid className="size-[18px]" />
            Dashboard
          </NavLink>
          <NavLink
            href="/review"
            className={ITEM}
            activeClassName={ITEM_ACTIVE}
            idleClassName={ITEM_IDLE}
          >
            <Layers className="size-[18px]" />
            <span className="flex-1">Due today</span>
            {dueCount > 0 && (
              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary group-aria-[current=page]:bg-white/20 group-aria-[current=page]:text-primary-foreground">
                {dueCount}
              </span>
            )}
          </NavLink>
          <NavLink
            href="/search"
            className={ITEM}
            activeClassName={ITEM_ACTIVE}
            idleClassName={ITEM_IDLE}
          >
            <Search className="size-[18px]" />
            Search
          </NavLink>
        </div>

        {sessions.length > 0 && (
          <>
            <p className={`${SECTION} pt-7`}>Sessions</p>
            <div className="space-y-1">
              {sessions.map((s) => (
                <NavLink
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors"
                  activeClassName="bg-secondary text-foreground"
                  idleClassName="text-foreground/70 hover:bg-secondary/60 hover:text-foreground"
                >
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  {s.due > 0 && (
                    <span
                      title={`${s.due} due`}
                      className="size-1.5 shrink-0 rounded-full bg-primary"
                    />
                  )}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className={`${ITEM} ${ITEM_IDLE} w-full text-left`}
          >
            <LogOut className="size-[18px]" />
            <span className="min-w-0 flex-1 truncate">
              {profileName ? `Sign out ${profileName}` : "Sign out"}
            </span>
          </button>
        </form>
      </div>
    </aside>
  );
}

// Mobile: a compact top bar (brand + sign out) plus a bottom tab bar. No JS,
// no drawer — three destinations don't need one.
export function MobileBar({ dueCount }: { dueCount: number }) {
  const tab =
    "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors";
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-5 backdrop-blur-sm lg:hidden">
        <Link
          href="/"
          prefetch={false}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="size-3.5" />
          </span>
          Valedictorian
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
        <NavLink
          href="/"
          exact
          className={tab}
          activeClassName="text-primary"
          idleClassName="text-muted-foreground"
        >
          <LayoutGrid className="size-5" />
          Home
        </NavLink>
        <NavLink
          href="/review"
          className={tab}
          activeClassName="text-primary"
          idleClassName="text-muted-foreground"
        >
          <span className="relative">
            <Layers className="size-5" />
            {dueCount > 0 && (
              <span className="absolute -right-1.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
            )}
          </span>
          Due
        </NavLink>
        <NavLink
          href="/search"
          className={tab}
          activeClassName="text-primary"
          idleClassName="text-muted-foreground"
        >
          <Search className="size-5" />
          Search
        </NavLink>
      </nav>
    </>
  );
}
