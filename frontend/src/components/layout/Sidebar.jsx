import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition";
const navIdle = "text-slate-700 hover:bg-slate-100";
const navActive = "bg-indigo-600 text-white shadow-sm";

export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const Link = ({ to, icon, children }) => (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${navBase} ${isActive ? navActive : navIdle}`
      }
    >
      {icon}
      <span className="truncate">{children}</span>
    </NavLink>
  );

  return (
    <div className="h-full w-full border-r border-slate-200 bg-white flex flex-col">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Package className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              Inventory App
            </div>
            <div className="text-xs text-slate-500 truncate">
              Business Console
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
          <Link to="/" icon={<LayoutDashboard className="h-5 w-5" />}>
            Dashboard
          </Link>
        </div>

        <div className="text-[11px] uppercase tracking-wide text-slate-400 px-2 mt-5 mb-2">
          Masters
        </div>

        <div className="space-y-1">
          <SidebarDropdown
            title="Inventory"
            icon={<Package className="h-5 w-5" />}
          >
            <Link to="/add-item" icon={<PlusCircle className="h-4 w-4" />}>
              Add Item
            </Link>
            <Link to="/items" icon={<List className="h-4 w-4" />}>
              Item List
            </Link>

            <Link to="/add-location" icon={<MapPin className="h-4 w-4" />}>
              Add Location
            </Link>
            <Link to="/locations" icon={<Map className="h-4 w-4" />}>
              Locations
            </Link>

            <Link to="/add-warehouse" icon={<PlusSquare className="h-4 w-4" />}>
              Add Warehouse
            </Link>
            <Link to="/warehouses" icon={<Warehouse className="h-4 w-4" />}>
              Warehouses
            </Link>

            <Link to="/stock-adjust" icon={<Wrench className="h-4 w-4" />}>
              Stock Adjustment
            </Link>
          </SidebarDropdown>

          <SidebarDropdown
            title="Stock Movement"
            icon={<MoveHorizontal className="h-5 w-5" />}
          >
            <Link to="/stock-in" icon={<ArrowDownCircle className="h-4 w-4" />}>
              Stock In
            </Link>
            <Link
              to="/stock-report"
              icon={<ArrowDownCircle className="h-4 w-4" />}
            >
              Stock In Report
            </Link>
            <Link to="/stock-out" icon={<ArrowUpCircle className="h-4 w-4" />}>
              Stock Out
            </Link>
          </SidebarDropdown>

          <SidebarDropdown title="Transfers" icon={<Repeat className="h-5 w-5" />}>
            <Link to="/stock-transfer" icon={<Repeat className="h-4 w-4" />}>
              Initiate Transfer
            </Link>
            <Link to="/transfer-report" icon={<FileText className="h-4 w-4" />}>
              Transfer History
            </Link>
          </SidebarDropdown>

          <SidebarDropdown title="Returns" icon={<Undo2 className="h-5 w-5" />}>
            <Link
              to="/add-demo-returns"
              icon={<FilePlus2 className="h-4 w-4" />}
            >
              Add Demo Return
            </Link>
            <Link to="/demo-returns" icon={<Undo2 className="h-4 w-4" />}>
              View Demo Returns
            </Link>
          </SidebarDropdown>

          <SidebarDropdown title="Reports" icon={<BarChart2 className="h-5 w-5" />}>
            <Link to="/stock" icon={<Warehouse className="h-4 w-4" />}>
              Current Stock
            </Link>
            <Link to="/ledger" icon={<FileText className="h-4 w-4" />}>
              Stock Ledger
            </Link>
          </SidebarDropdown>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
