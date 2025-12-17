import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import SidebarDropdown from "./SidebarDropdown";

// Lucide icons
import {
  LayoutDashboard,
  Package,
  List,
  PlusCircle,
  Wrench,
  MoveHorizontal,
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
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

const Sidebar = () => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const linkStyle =
    "flex items-center gap-2 px-4 py-2 hover:bg-blue-100 transition-colors rounded";
  const activeStyle = "bg-blue-500 text-white";

  return (
    <div className="w-64 h-screen bg-white border-r shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="p-4">
        <h2 className="text-xl font-bold mb-6 text-blue-800 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" />
          Inventory App
        </h2>

        <nav className="space-y-2">
          {/* Dashboard */}
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-100 transition-colors ${
                isActive ? activeStyle : ""
              }`
            }>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>

          {/* Inventory */}
          <SidebarDropdown
            icon={<Package className="w-5 h-5" />}
            title="Inventory">
           <NavLink
              to="/add-item"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <PlusCircle className="w-4 h-4" />
              Add Item
            </NavLink>
            <NavLink
              to="/items"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <List className="w-4 h-4" />
              Item List
            </NavLink>
            
            <NavLink
              to="/add-location"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <MapPin className="w-4 h-4" />
              Add Location
            </NavLink>
            <NavLink
              to="/locations"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <Map className="w-4 h-4" />
              Locations
            </NavLink>
            
            <NavLink
              to="/add-warehouse"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <PlusSquare className="w-4 h-4" />
              Add Warehouse
            </NavLink>
            <NavLink
              to="/warehouses"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <Warehouse className="w-4 h-4" />
              Warehouses
            </NavLink>
            <NavLink
              to="/stock-adjust"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <Wrench className="w-4 h-4" />
              Stock Adjustment
            </NavLink>
          </SidebarDropdown>

          {/* Stock Movement */}
          <SidebarDropdown
            icon={<MoveHorizontal className="w-5 h-5" />}
            title="Stock Movement">
            <NavLink
              to="/stock-in"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <ArrowDownCircle className="w-4 h-4" />
              Stock In
            </NavLink>
            {/* <NavLink
              to="/import-stock-in"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <ArrowDownCircle className="w-4 h-4" />
              Import Excel
            </NavLink> */}

            <NavLink
              to="/stock-report"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <ArrowDownCircle className="w-4 h-4" />
              Stock In Report
            </NavLink>
            <NavLink
              to="/stock-out"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <ArrowUpCircle className="w-4 h-4" />
              Stock Out
            </NavLink>
            {/* <NavLink
              to="/view-stock-out"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <Eye className="w-4 h-4" />
              View Stock Out
            </NavLink> */}
          </SidebarDropdown>

          {/* Transfers */}
          <SidebarDropdown
            icon={<Repeat className="w-5 h-5" />}
            title="Transfers">
            <NavLink
              to="/stock-transfer"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <Repeat className="w-4 h-4" />
              Initiate Transfer
            </NavLink>
            <NavLink
              to="/transfer-report"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <FileText className="w-4 h-4" />
              Transfer History
            </NavLink>
          </SidebarDropdown>

          {/* Returns */}
          <SidebarDropdown icon={<Undo2 className="w-5 h-5" />} title="Returns">
            <NavLink
              to="/add-demo-returns"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <FilePlus2 className="w-4 h-4" />
              Add Demo Return
            </NavLink>
            <NavLink
              to="/demo-returns"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <Undo2 className="w-4 h-4" />
              View Demo Returns
            </NavLink>
          </SidebarDropdown>

          {/* Reports */}
          <SidebarDropdown
            icon={<BarChart2 className="w-5 h-5" />}
            title="Reports">
            <NavLink
              to="/stock"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <Warehouse className="w-4 h-4" />
              Current Stock
            </NavLink>
            <NavLink
              to="/ledger"
              className={({ isActive }) =>
                `${linkStyle} ${isActive ? activeStyle : ""}`
              }>
              <FileText className="w-4 h-4" />
              Stock Ledger
            </NavLink>
          </SidebarDropdown>
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4">
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-2">
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
