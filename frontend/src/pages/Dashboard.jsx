// src/pages/Dashboard.jsx
import React, { useMemo } from "react";
import {
  useGetCurrentStockSummaryQuery,
  useGetCurrentStockQuery,
  useListStockOutQuery,
  useGetWarehousesQuery,
  useGetItemsQuery,
  useGetPendingDemoReturnsQuery,
} from "../services/inventoryApi";

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  FaBox, FaWarehouse, FaArrowCircleDown, FaShoppingCart, FaClock,
} from "react-icons/fa";

const COLORS = ["#FF8042", "#FFBB28", "#00C49F", "#0088FE", "#A28EFF"];

const Dashboard = () => {
  const { data: summaryData, isFetching: fetchingSummary, isLoading: loadingSummary } =
    useGetCurrentStockSummaryQuery();
  const { data: stockData, isFetching: fetchingStock, isLoading: loadingStock, error: stockErr } =
    useGetCurrentStockQuery("");
  const { data: stockOutData, isFetching: fetchingStockOut, isLoading: loadingStockOut } =
    useListStockOutQuery();
  const { data: demoPendingData, isFetching: fetchingDemo, isLoading: loadingDemo } =
    useGetPendingDemoReturnsQuery();

  useGetWarehousesQuery();
  useGetItemsQuery();

  const stocks = useMemo(() => (Array.isArray(stockData) ? stockData : []), [stockData]);
  const stockOutRows = useMemo(() => (Array.isArray(stockOutData) ? stockOutData : []), [stockOutData]);

  const stats = useMemo(() => {
    const s = summaryData || {};
    return {
      totalItems: Number(s.totalItems || 0),
      totalStock: Number(s.totalStock || 0),
      lowStockItems: Number(s.lowStockItems || 0),
    };
  }, [summaryData]);

  const saleOutCount = useMemo(
    () => stockOutRows.filter((r) => (r.purpose || "").toLowerCase() === "sale").length,
    [stockOutRows]
  );
  const demoPendingCount = useMemo(
    () => (Array.isArray(demoPendingData) ? demoPendingData.length : 0),
    [demoPendingData]
  );
  const pieData = useMemo(() => {
    const counts = stockOutRows.reduce((acc, row) => {
      const key = row.purpose || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [stockOutRows]);

  const initialLoading = loadingSummary || loadingStock || loadingStockOut || loadingDemo;
  const backgroundFetching =
    !initialLoading && (fetchingSummary || fetchingStock || fetchingStockOut || fetchingDemo);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="p-4 md:p-6">
      {/* cap overall width so sidebar never wraps */}
      <div className="mx-auto w-full max-w-[1200px]">
        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-100 to-white rounded-xl px-6 py-4 mb-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-800">Inventory Dashboard</h1>
          <p className="text-gray-600">
            Welcome <strong>{user?.name || "Guest"}</strong>{" "}
            <span className="text-sm text-gray-500">({user?.role || "Viewer"})</span>
          </p>
          {backgroundFetching && (
            <p className="text-xs text-blue-500 mt-1">Refreshing data…</p>
          )}
        </div>

        {/* Stats: 2 columns by default, only jump to 5 on large screens */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard title="Total Items" value={stats.totalItems} icon={<FaBox />} />
          <StatCard title="Total Stock" value={stats.totalStock} icon={<FaArrowCircleDown />} />
          <StatCard title="Low Stock Items" value={stats.lowStockItems} icon={<FaWarehouse />} />
          <StatCard title="Stock Out (Sale)" value={saleOutCount} icon={<FaShoppingCart />} />
          <StatCard title="Demo Pending Return" value={demoPendingCount} icon={<FaClock />} />
        </div>

        {/* Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">📦 Top Stock Overview</h2>
            {initialLoading && stocks.length === 0 ? (
              <p className="text-gray-500">Loading…</p>
            ) : stockErr ? (
              <p className="text-red-600 text-sm">Failed to load stock.</p>
            ) : stocks.length > 0 ? (
              <table className="min-w-full text-sm border rounded overflow-hidden">
                <thead className="bg-gray-100 text-gray-700 font-medium">
                  <tr>
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-4 py-2">Model</th>
                    <th className="px-4 py-2">Warehouse</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.slice(0, 5).map((s, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{s.item || s.itemName || "N/A"}</td>
                      <td className="px-4 py-2 text-center">{s.modelNo || "-"}</td>
                      <td className="px-4 py-2 text-center">{s.warehouse || s.warehouseName || "N/A"}</td>
                      <td className="px-4 py-2 text-right">{s.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 italic">No stock data found.</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">📊 Stock Out by Purpose</h2>
            {initialLoading && pieData.length === 0 ? (
              <p className="text-gray-500">Loading…</p>
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 italic">No stock out data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white rounded-lg shadow flex items-center justify-between p-4">
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <h3 className="text-xl font-bold text-blue-700">{value}</h3>
    </div>
    <div className="text-blue-400 text-2xl">{icon}</div>
  </div>
);
