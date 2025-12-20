import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/layout/Layout";
import PrivateRoute from "./components/PrivateRoute";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Auth
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Pages
import Dashboard from "./pages/Dashboard";
import ItemList from "./pages/items/ItemList";
import AddItem from "./pages/items/AddItem";
import WarehouseList from "./pages/warehouses/WarehouseList";
import AddWarehouse from "./pages/warehouses/AddWarehouse";
import StockIn from "./pages/stock/AddStockIn";
import StockOut from "./pages/stock/AddStockOut";
import CurrentStock from "./pages/reports/CurrentStock";
import StockLedger from "./pages/reports/StockLedger";
import AddDemoItems from "./pages/demo/AddDemoItems";
import ViewDemoReturns from "./pages/demo/ViewDemoReturns";
import StockTransfer from "./pages/stock-transfer/StockTransfer";
import TransferReport from "./pages/stock-transfer/TransferReport";
import AdjustStock from "./pages/stock/AdjustStock";
import ViewStockOut from "./pages/stock/ViewStockOut";
import AddLocation from "./pages/Location/AddLocation";
import LocationList from "./pages/Location/LocationList";
import StockInReport from "./pages/stock/StockInReport";
import StockInExcelImport from "./pages/items/StockInExcelImport";
import StockItemImport from "./pages/imports/ItemsExcelImport";

function AppShellLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold">
            IA
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              Inventory App
            </div>
            <div className="text-xs text-slate-500 truncate">
              Preparing workspace…
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-2 w-2/3 bg-indigo-600 rounded-full animate-pulse" />
          </div>
          <div className="text-xs text-slate-500">Loading…</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(Boolean(token));
    setLoading(false);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
  }, []);

  if (loading) return <AppShellLoader />;

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={<Login setIsAuthenticated={setIsAuthenticated} />}
        />
        <Route path="/brcomponent/signup" element={<Signup />} />

        {/* Protected */}
        <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="items" element={<ItemList />} />
            <Route path="add-item" element={<AddItem />} />
            <Route path="warehouses" element={<WarehouseList />} />
            <Route path="add-warehouse" element={<AddWarehouse />} />
            <Route path="add-location" element={<AddLocation />} />
            <Route path="locations" element={<LocationList />} />
            <Route path="stock-in" element={<StockIn />} />
            <Route path="stock-report" element={<StockInReport />} />
            <Route path="stock-out" element={<StockOut />} />
            <Route path="view-stock-out" element={<ViewStockOut />} />
            <Route path="stock" element={<CurrentStock />} />
            <Route path="ledger" element={<StockLedger />} />
            <Route path="add-demo-returns" element={<AddDemoItems />} />
            <Route path="demo-returns" element={<ViewDemoReturns />} />
            <Route path="stock-transfer" element={<StockTransfer />} />
            <Route path="transfer-report" element={<TransferReport />} />
            <Route path="stock-adjust" element={<AdjustStock />} />
            <Route path="import-stock-in" element={<StockInExcelImport />} />
            <Route path="import-items" element={<StockItemImport />} />

            {/* optional: logout route */}
            <Route
              path="logout"
              element={<Navigate to="/login" replace />}
            />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}
