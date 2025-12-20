import React, { useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import SidebarDropdown from "./SidebarDropdown";
import {
  LayoutDashboard,
  Package,
  List,
  PlusCircle,
  Wrench,
  MoveHorizontal,
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  FileText,
  Undo2,
  FilePlus2,
  BarChart2,
  Warehouse,
  LogOut,
  Map,
  MapPin,
  PlusSquare,
} from "lucide-react";

const navBase =
  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition outline-none";
const navIdle =
  "text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500";
const navActive =
  "bg-indigo-600 text-white shadow-sm hover:bg-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-400";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const LinkItem = ({ to, icon, children, end }) => (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => cx(navBase, isActive ? navActive : navIdle)}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </NavLink>
  );

  const roleText = user?.role ? String(user.role) : "Viewer";

  return (
    <div className="h-full w-full border-r border-slate-200 bg-white flex flex-col">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Package className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              Inventory App
            </div>
            <div className="text-xs text-slate-500 truncate">
              {user?.name ? `${user.name} • ${roleText}` : `Business Console • ${roleText}`}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-auto px-3 py-3">
        <div className="text-[11px] uppercase tracking-wide text-slate-400 px-2 mb-2">
          Overview
        </div>

        <div className="space-y-1">
          <LinkItem to="/" end icon={<LayoutDashboard className="h-5 w-5" />}>
            Dashboard
          </LinkItem>
        </div>

        <div className="text-[11px] uppercase tracking-wide text-slate-400 px-2 mt-5 mb-2">
          Masters
        </div>

        <div className="space-y-1">
          <SidebarDropdown
            title="Inventory"
            icon={<Package className="h-5 w-5" />}
            paths={[
              "/add-item",
              "/items",
              "/add-location",
              "/locations",
              "/add-warehouse",
              "/warehouses",
              "/stock-adjust",
            ]}
          >
            <LinkItem to="/add-item" icon={<PlusCircle className="h-4 w-4" />}>
              Add Item
            </LinkItem>

            <LinkItem to="/items" icon={<List className="h-4 w-4" />}>
              Item List
            </LinkItem>

            <LinkItem to="/add-location" icon={<MapPin className="h-4 w-4" />}>
              Add Location
            </LinkItem>

            <LinkItem to="/locations" icon={<Map className="h-4 w-4" />}>
              Locations
            </LinkItem>

            <LinkItem to="/add-warehouse" icon={<PlusSquare className="h-4 w-4" />}>
              Add Warehouse
            </LinkItem>

            <LinkItem to="/warehouses" icon={<Warehouse className="h-4 w-4" />}>
              Warehouses
            </LinkItem>

            <LinkItem to="/stock-adjust" icon={<Wrench className="h-4 w-4" />}>
              Stock Adjustment
            </LinkItem>
          </SidebarDropdown>

          <SidebarDropdown
            title="Stock Movement"
            icon={<MoveHorizontal className="h-5 w-5" />}
            paths={["/stock-in", "/stock-report", "/stock-out"]}
          >
            <LinkItem to="/stock-in" icon={<ArrowDownCircle className="h-4 w-4" />}>
              Stock In
            </LinkItem>

            <LinkItem to="/stock-report" icon={<ArrowDownCircle className="h-4 w-4" />}>
              Stock In Report
            </LinkItem>

            <LinkItem to="/stock-out" icon={<ArrowUpCircle className="h-4 w-4" />}>
              Stock Out
            </LinkItem>
          </SidebarDropdown>

          <SidebarDropdown
            title="Transfers"
            icon={<Repeat className="h-5 w-5" />}
            paths={["/stock-transfer", "/transfer-report"]}
          >
            <LinkItem to="/stock-transfer" icon={<Repeat className="h-4 w-4" />}>
              Initiate Transfer
            </LinkItem>

            <LinkItem to="/transfer-report" icon={<FileText className="h-4 w-4" />}>
              Transfer History
            </LinkItem>
          </SidebarDropdown>

          <SidebarDropdown
            title="Returns"
            icon={<Undo2 className="h-5 w-5" />}
            paths={["/add-demo-returns", "/demo-returns"]}
          >
            <LinkItem to="/add-demo-returns" icon={<FilePlus2 className="h-4 w-4" />}>
              Add Demo Return
            </LinkItem>

            <LinkItem to="/demo-returns" icon={<Undo2 className="h-4 w-4" />}>
              View Demo Returns
            </LinkItem>
          </SidebarDropdown>

          <SidebarDropdown
            title="Reports"
            icon={<BarChart2 className="h-5 w-5" />}
            paths={["/stock", "/ledger"]}
          >
            <LinkItem to="/stock" icon={<Warehouse className="h-4 w-4" />}>
              Current Stock
            </LinkItem>

            <LinkItem to="/ledger" icon={<FileText className="h-4 w-4" />}>
              Stock Ledger
            </LinkItem>
          </SidebarDropdown>
        </div>

        {/* subtle divider */}
        <div className="mt-5 border-t border-slate-200" />

        {/* current route hint (small, optional) */}
        <div className="mt-3 px-2 text-[11px] text-slate-400 truncate">
          {location.pathname}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition focus-visible:ring-2 focus-visible:ring-rose-400"
          type="button"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
