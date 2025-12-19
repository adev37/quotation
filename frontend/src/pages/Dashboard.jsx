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
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  FaBox,
  FaWarehouse,
  FaArrowCircleDown,
  FaShoppingCart,
  FaClock,
} from "react-icons/fa";

const COLORS = ["#FF8042", "#FFBB28", "#00C49F", "#0088FE", "#A28EFF"];

const Dashboard = () => {
  const {
    data: summaryData,
    isLoading: loadingSummary,
    isFetching: fetchingSummary,
  } = useGetCurrentStockSummaryQuery();

  const {
    data: stockData,
    isLoading: loadingStock,
    isFetching: fetchingStock,
    error: stockErr,
  } = useGetCurrentStockQuery("");

  const {
    data: stockOutData,
    isLoading: loadingStockOut,
    isFetching: fetchingStockOut,
  } = useListStockOutQuery();

  const {
    data: demoPendingData,
    isLoading: loadingDemo,
    isFetching: fetchingDemo,
  } = useGetPendingDemoReturnsQuery();

  // warm cache (optional)
  useGetWarehousesQuery();
  useGetItemsQuery();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const stocks = useMemo(
    () => (Array.isArray(stockData) ? stockData : []),
    [stockData]
  );

  const stockOutRows = useMemo(
    () => (Array.isArray(stockOutData) ? stockOutData : []),
    [stockOutData]
  );

  const stats = useMemo(() => {
    const s = summaryData || {};
    return {
      totalItems: Number(s.totalItems || 0),
      totalStock: Number(s.totalStock || 0),
      lowStockItems: Number(s.lowStockItems || 0),
    };
  }, [summaryData]);

  const saleOutCount = useMemo(() => {
    return stockOutRows.filter(
      (r) => (r.purpose || "").toLowerCase() === "sale"
    ).length;
  }, [stockOutRows]);

  const demoPendingCount = useMemo(() => {
    return Array.isArray(demoPendingData) ? demoPendingData.length : 0;
  }, [demoPendingData]);

  const pieData = useMemo(() => {
    const counts = stockOutRows.reduce((acc, row) => {
      const key = row.purpose || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [stockOutRows]);

  const initialLoading =
    loadingSummary || loadingStock || loadingStockOut || loadingDemo;

  const backgroundFetching =
    !initialLoading &&
    (fetchingSummary || fetchingStock || fetchingStockOut || fetchingDemo);

  return (
    <div className="w-full">
      {/* Page padding */}
      <div className="p-3 sm:p-4 md:p-6">
        {/* Important: cap width so layout never breaks */}
        <div className="mx-auto w-full max-w-[1200px]">
          {/* HERO */}
          <div className="rounded-2xl border bg-gradient-to-r from-blue-100 to-white px-4 py-4 sm:px-6 sm:py-5 shadow-sm">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
                Inventory Dashboard
              </h1>

              <p className="text-sm sm:text-base text-gray-600">
                Welcome{" "}
                <span className="font-semibold text-gray-800">
                  {user?.name || "Guest"}
                </span>{" "}
                <span className="text-xs sm:text-sm text-gray-500">
                  ({user?.role || "Viewer"})
                </span>
              </p>

              {backgroundFetching && (
                <p className="text-xs text-blue-600 mt-1">Refreshing data…</p>
              )}
            </div>
          </div>

          {/* STATS */}
          <div className="mt-5 sm:mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            <StatCard title="Total Items" value={stats.totalItems} icon={<FaBox />} />
            <StatCard title="Total Stock" value={stats.totalStock} icon={<FaArrowCircleDown />} />
            <StatCard title="Low Stock Items" value={stats.lowStockItems} icon={<FaWarehouse />} />
            <StatCard title="Stock Out (Sale)" value={saleOutCount} icon={<FaShoppingCart />} />
            <StatCard title="Demo Pending Return" value={demoPendingCount} icon={<FaClock />} />
          </div>

          {/* CONTENT GRID */}
          <div className="mt-5 sm:mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Stock Overview */}
            <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
                📦 Top Stock Overview
              </h2>

              {initialLoading && stocks.length === 0 ? (
                <div className="text-gray-500 text-sm">Loading…</div>
              ) : stockErr ? (
                <div className="text-red-600 text-sm">Failed to load stock.</div>
              ) : stocks.length > 0 ? (
                <div className="w-full overflow-x-auto rounded-lg border">
                  <table className="min-w-[700px] w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-semibold">
                      <tr>
                        <th className="px-4 py-2 text-left whitespace-nowrap">Item</th>
                        <th className="px-4 py-2 text-center whitespace-nowrap">Model</th>
                        <th className="px-4 py-2 text-center whitespace-nowrap">Warehouse</th>
                        <th className="px-4 py-2 text-right whitespace-nowrap">Qty</th>
                      </tr>
                    </thead>

                    <tbody>
                      {stocks.slice(0, 8).map((s, i) => (
                        <tr key={i} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2">
                            {s.item || s.itemName || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {s.modelNo || "-"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {s.warehouse || s.warehouseName || "N/A"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {Number(s.quantity || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-400 italic text-sm">No stock data found.</div>
              )}
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
                📊 Stock Out by Purpose
              </h2>

              {initialLoading && pieData.length === 0 ? (
                <div className="text-gray-500 text-sm">Loading…</div>
              ) : pieData.length > 0 ? (
                <div className="w-full h-[260px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        label
                      >
                        {pieData.map((_, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={COLORS[idx % COLORS.length]}
                          />
                        ))}
                      </Pie>

                      <Tooltip />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-gray-400 italic text-sm">
                  No stock out data yet.
                </div>
              )}
            </div>
          </div>

          {/* Optional bottom spacing */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

const StatCard = ({ title, value, icon }) => {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4 flex items-center justify-between min-w-0">
      <div className="min-w-0">
        <p className="text-gray-500 text-xs sm:text-sm truncate">{title}</p>
        <h3 className="text-lg sm:text-xl font-bold text-blue-700 truncate">
          {value}
        </h3>
      </div>
      <div className="text-blue-400 text-xl sm:text-2xl shrink-0">{icon}</div>
    </div>
  );
};
