import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // prevent background scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar (large screens) */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-72">
        <Sidebar />
      </aside>

      {/* Drawer */}
      {drawerOpen ? (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-[340px] bg-white shadow-2xl border-r border-slate-200">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Main */}
      <div className="lg:pl-72">
        <Topbar onOpenSidebar={() => setDrawerOpen(true)} />

        <main className="px-3 sm:px-5 md:px-7 py-4">
          <div className="mx-auto w-full max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
