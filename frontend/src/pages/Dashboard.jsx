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
  FaChartBar,
  FaExchangeAlt,
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

  // ---------- Insights ----------
  const warehouseStats = useMemo(() => {
    const map = new Map();

    for (const s of stocks) {
      const wh = s.warehouse || s.warehouseName || "Unknown";
      const qty = Number(s.quantity || 0);

      if (!map.has(wh)) map.set(wh, { warehouse: wh, totalQty: 0, itemRows: 0 });

      const row = map.get(wh);
      row.totalQty += qty;
      row.itemRows += 1;
    }

    const rows = Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
    const maxQty = rows[0]?.totalQty || 1;

    return { rows: rows.slice(0, 6), maxQty };
  }, [stocks]);

  // ✅ only latest 2 rows
  const recentStockOut = useMemo(() => {
    const rows = Array.isArray(stockOutRows) ? [...stockOutRows] : [];
    rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return rows.slice(0, 2).map((r) => ({
      item: r.item?.name || r.itemName || "N/A",
      model: r.item?.modelNo || r.modelNo || "-",
      purpose: r.purpose || "—",
      qty: Number(r.quantity || 0),
      warehouse: r.warehouse?.name || r.warehouseName || "—",
      date: r.date ? new Date(r.date).toLocaleDateString("en-GB") : "—",
    }));
  }, [stockOutRows]);

  const initialLoading =
    loadingSummary || loadingStock || loadingStockOut || loadingDemo;

  const backgroundFetching =
    !initialLoading &&
    (fetchingSummary || fetchingStock || fetchingStockOut || fetchingDemo);

  return (
    <div className="w-full">
      {/* ✅ prevent vertical scrollbar inside dashboard page (only page scroll remains) */}
      <div className="p-3 sm:p-4 md:p-6 overflow-y-hidden">
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
            <StatCard
              title="Total Stock"
              value={stats.totalStock}
              icon={<FaArrowCircleDown />}
            />
            <StatCard
              title="Low Stock Items"
              value={stats.lowStockItems}
              icon={<FaWarehouse />}
            />
            <StatCard title="Stock Out (Sale)" value={saleOutCount} icon={<FaShoppingCart />} />
            <StatCard title="Demo Pending Return" value={demoPendingCount} icon={<FaClock />} />
          </div>

          {/* CONTENT GRID */}
          <div className="mt-5 sm:mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Inventory Insights */}
            <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FaChartBar className="text-blue-500" />
                  Inventory Insights
                </h2>

                <div className="text-xs text-gray-500">
                  {backgroundFetching ? "Refreshing…" : "Live"}
                </div>
              </div>

              {initialLoading && stocks.length === 0 ? (
                <div className="text-gray-500 text-sm">Loading…</div>
              ) : stockErr ? (
                <div className="text-red-600 text-sm">Failed to load stock.</div>
              ) : (
                <div className="space-y-4">
                  {/* 1) Warehouse Distribution */}
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <FaWarehouse className="text-indigo-500" />
                        Warehouse Distribution
                      </p>
                      <span className="text-xs text-gray-500">
                        Top {warehouseStats.rows.length || 0}
                      </span>
                    </div>

                    {warehouseStats.rows.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No warehouse data.</p>
                    ) : (
                      <div className="space-y-2">
                        {warehouseStats.rows.map((w) => (
                          <MiniBarRow
                            key={w.warehouse}
                            title={w.warehouse}
                            meta={`${w.itemRows} rows`}
                            value={w.totalQty}
                            max={warehouseStats.maxQty}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2) Recent Stock Out (latest 2 only) */}
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <FaExchangeAlt className="text-rose-500" />
                        Recent Stock Out
                      </p>
                      <span className="text-xs text-gray-500">Latest 2</span>
                    </div>

                    {recentStockOut.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No stock-out records.</p>
                    ) : (
                      <div className="space-y-2">
                        {recentStockOut.map((r, i) => (
                          <div
                            key={i}
                            className="flex items-start justify-between gap-3 rounded-lg bg-white border px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {r.item}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {r.model} • {r.warehouse}
                              </p>
                              <p className="text-[11px] text-gray-400">{r.date}</p>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  String(r.purpose).toLowerCase() === "sale"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {r.purpose}
                              </span>
                              <p className="text-sm font-bold text-rose-600 mt-1">
                                -{Number.isFinite(r.qty) ? r.qty : 0}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>

                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-gray-400 italic text-sm">No stock out data yet.</div>
              )}
            </div>
          </div>

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

const MiniBarRow = ({ title, meta, value, max }) => {
  const pct = Math.max(
    0,
    Math.min(100, (Number(value || 0) / (Number(max || 1))) * 100)
  );

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-800 font-medium truncate">{title}</p>
          <p className="text-xs text-gray-500 shrink-0">{meta}</p>
        </div>

        <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="text-sm font-semibold text-gray-700 w-16 text-right">
        {Number(value || 0)}
      </div>
    </div>
  );
};
