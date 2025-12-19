import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// ✅ Base URL Strategy:
// - Production: set VITE_API_BASE_URL="https://your-backend.com/api"
// - Local Dev: leave empty + use Vite proxy -> "/api"
const normalizeBase = (url) => String(url || "").trim().replace(/\/+$/, "");
const ensureApiSuffix = (url) => (url && !/\/api$/i.test(url) ? `${url}/api` : url);

const RAW_ENV = normalizeBase(import.meta.env.VITE_API_BASE_URL);
const BASE_URL = RAW_ENV ? ensureApiSuffix(RAW_ENV) : "/api";

export const inventoryApi = createApi({
  reducerPath: "inventoryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: [
    "Items",
    "Warehouses",
    "Locations",
    "CurrentStock",
    "StockIn",
    "StockOut",
    "Ledger",
    "DemoReturns",
    "Transfers",
    "Auth",
  ],
  endpoints: (builder) => ({
    // ---------- AUTH ----------
    login: builder.mutation({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      invalidatesTags: ["Auth"],
    }),
    signup: builder.mutation({
      query: (body) => ({ url: "/auth/signup", method: "POST", body }),
      invalidatesTags: ["Auth"],
    }),

    // ---------- ITEMS ----------
    getItems: builder.query({
      query: () => "/items",
      providesTags: (result) => {
        const list = Array.isArray(result) ? result : result?.items || [];
        return list.length
          ? [...list.map((i) => ({ type: "Items", id: i._id })), { type: "Items", id: "LIST" }]
          : [{ type: "Items", id: "LIST" }];
      },
    }),
    addItem: builder.mutation({
      query: (body) => ({ url: "/items", method: "POST", body }),
      invalidatesTags: [{ type: "Items", id: "LIST" }, { type: "CurrentStock", id: "SUMMARY" }],
    }),
    updateItem: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/items/${id}`, method: "PUT", body }),
      invalidatesTags: (r, e, { id }) => [
        { type: "Items", id },
        { type: "Items", id: "LIST" },
        { type: "CurrentStock", id: "SUMMARY" },
      ],
    }),
    deleteItem: builder.mutation({
      query: (id) => ({ url: `/items/${id}`, method: "DELETE" }),
      invalidatesTags: (r, e, id) => [
        { type: "Items", id },
        { type: "Items", id: "LIST" },
        { type: "CurrentStock", id: "SUMMARY" },
      ],
    }),

    // ---------- WAREHOUSES ----------
    getWarehouses: builder.query({
      query: () => "/warehouses",
      providesTags: (result) =>
        result
          ? [...result.map((w) => ({ type: "Warehouses", id: w._id })), { type: "Warehouses", id: "LIST" }]
          : [{ type: "Warehouses", id: "LIST" }],
    }),
    addWarehouse: builder.mutation({
      query: (body) => ({ url: "/warehouses", method: "POST", body }),
      invalidatesTags: [{ type: "Warehouses", id: "LIST" }],
    }),
    updateWarehouse: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/warehouses/${id}`, method: "PUT", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Warehouses", id }, { type: "Warehouses", id: "LIST" }],
    }),
    deleteWarehouse: builder.mutation({
      query: (id) => ({ url: `/warehouses/${id}`, method: "DELETE" }),
      invalidatesTags: (r, e, id) => [{ type: "Warehouses", id }, { type: "Warehouses", id: "LIST" }],
    }),

    // ---------- LOCATIONS ----------
    // ✅ Old (flat list) - keep if your app still uses it somewhere
    getLocations: builder.query({
      query: (warehouseId) =>
        warehouseId ? `/locations?warehouse=${encodeURIComponent(warehouseId)}` : "/locations",
      providesTags: (result) => {
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result?.locations)
          ? result.locations
          : Array.isArray(result?.data)
          ? result.data
          : [];

        return list.length
          ? [...list.map((l) => ({ type: "Locations", id: l._id })), { type: "Locations", id: "LIST" }]
          : [{ type: "Locations", id: "LIST" }];
      },
    }),

    // ✅ NEW: Grouped locations (server-side pagination + search)
    // Expected response shape example:
    // { data: [...], page: 1, totalPages: 5, total: 45, limit: 10 }
    getGroupedLocations: builder.query({
      query: ({ page = 1, limit = 10, search = "" } = {}) =>
        `/locations/grouped?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`,
      providesTags: [{ type: "Locations", id: "LIST" }],
    }),

    // ✅ create location (your backend now creates for ALL warehouses by default)
    addLocation: builder.mutation({
      query: (body) => ({ url: "/locations", method: "POST", body }),
      invalidatesTags: [{ type: "Locations", id: "LIST" }],
    }),

    // ✅ NEW: Import locations from Excel (multipart/form-data)
    // Send FormData with key "file"
    importLocationsExcel: builder.mutation({
      query: (formData) => ({
        url: "/locations/import",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "Locations", id: "LIST" }],
    }),

    // update single by id (optional keep)
    updateLocationById: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/locations/${id}`, method: "PUT", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Locations", id }, { type: "Locations", id: "LIST" }],
    }),

    // ✅ Edit All by rack name
    updateLocationByName: builder.mutation({
      query: ({ name, ...body }) => ({
        url: `/locations/by-name/${encodeURIComponent(name)}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Locations", id: "LIST" }],
    }),

    // delete single (optional keep)
    deleteLocation: builder.mutation({
      query: (id) => ({ url: `/locations/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Locations", id: "LIST" }],
    }),

    // ✅ Delete All by rack name
    deleteLocationByName: builder.mutation({
      query: (name) => ({
        url: `/locations/by-name/${encodeURIComponent(name)}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Locations", id: "LIST" }],
    }),

    // ---------- CURRENT STOCK ----------
    getCurrentStock: builder.query({
      query: (qs = "") => `/current-stock${qs ? `?${qs}` : ""}`,
      providesTags: [{ type: "CurrentStock", id: "LIST" }],
    }),
    getCurrentStockSummary: builder.query({
      query: () => "/current-stock/summary",
      providesTags: [{ type: "CurrentStock", id: "SUMMARY" }],
    }),
    getRackOptions: builder.query({
      query: ({ item, warehouse }) =>
        `/current-stock/rack-options?item=${encodeURIComponent(item)}&warehouse=${encodeURIComponent(warehouse)}`,
      providesTags: [{ type: "CurrentStock", id: "LIST" }],
    }),

    // ---------- STOCK IN ----------
    listStockIn: builder.query({
      query: () => "/stock-in",
      providesTags: [{ type: "StockIn", id: "LIST" }],
    }),
    createStockIn: builder.mutation({
      query: (body) => ({ url: "/stock-in", method: "POST", body }),
      invalidatesTags: [
        { type: "StockIn", id: "LIST" },
        { type: "CurrentStock", id: "LIST" },
        { type: "Ledger", id: "LIST" },
        { type: "CurrentStock", id: "SUMMARY" },
      ],
    }),
    getStockInChallan: builder.query({
      query: (stockInNo) => `/stock-in/challan/${encodeURIComponent(stockInNo)}`,
    }),

    // ---------- STOCK OUT ----------
    listStockOut: builder.query({
      query: () => "/stock-out",
      providesTags: [{ type: "StockOut", id: "LIST" }],
    }),
    createStockOut: builder.mutation({
      query: (body) => ({ url: "/stock-out", method: "POST", body }),
      invalidatesTags: [
        { type: "StockOut", id: "LIST" },
        { type: "CurrentStock", id: "LIST" },
        { type: "Ledger", id: "LIST" },
        { type: "DemoReturns", id: "LIST" },
        { type: "CurrentStock", id: "SUMMARY" },
      ],
    }),
    getStockOutChallan: builder.query({
      query: (stockOutNo) => `/stock-out/challan/${encodeURIComponent(stockOutNo)}`,
    }),

    // ---------- LEDGER ----------
    getLedger: builder.query({
      query: () => "/stock-ledger",
      providesTags: [{ type: "Ledger", id: "LIST" }],
    }),

    // ---------- DEMO RETURNS ----------
    getPendingDemoReturns: builder.query({
      query: () => "/demo-returns",
      providesTags: [{ type: "DemoReturns", id: "LIST" }],
    }),
    markDemoReturn: builder.mutation({
      query: (id) => ({ url: `/demo-returns/return/${id}`, method: "POST" }),
      invalidatesTags: [
        { type: "DemoReturns", id: "LIST" },
        { type: "DemoReturns", id: "REPORT" },
        { type: "CurrentStock", id: "LIST" },
        { type: "Ledger", id: "LIST" },
        { type: "CurrentStock", id: "SUMMARY" },
      ],
    }),
    getDemoReturnReport: builder.query({
      query: () => "/demo-returns/report",
      providesTags: [{ type: "DemoReturns", id: "REPORT" }],
    }),

    // ---------- TRANSFERS ----------
    getTransfers: builder.query({
      query: () => "/stock-transfers",
      providesTags: [{ type: "Transfers", id: "LIST" }],
    }),
    createTransfer: builder.mutation({
      query: (body) => ({ url: "/stock-transfers", method: "POST", body }),
      invalidatesTags: [
        { type: "Transfers", id: "LIST" },
        { type: "CurrentStock", id: "LIST" },
        { type: "Ledger", id: "LIST" },
        { type: "CurrentStock", id: "SUMMARY" },
      ],
    }),

    // ---------- ADJUSTMENTS ----------
    createAdjustment: builder.mutation({
      query: (body) => ({ url: "/stock-adjustments", method: "POST", body }),
      invalidatesTags: [
        { type: "CurrentStock", id: "LIST" },
        { type: "Ledger", id: "LIST" },
        { type: "CurrentStock", id: "SUMMARY" },
      ],
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,

  useGetItemsQuery,
  useAddItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,

  useGetWarehousesQuery,
  useAddWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeleteWarehouseMutation,

  useGetLocationsQuery,
  useGetGroupedLocationsQuery,
  useAddLocationMutation,
  useImportLocationsExcelMutation,
  useUpdateLocationByIdMutation,
  useUpdateLocationByNameMutation,
  useDeleteLocationMutation,
  useDeleteLocationByNameMutation,

  useGetCurrentStockQuery,
  useLazyGetCurrentStockQuery,
  useGetCurrentStockSummaryQuery,

  useLazyGetRackOptionsQuery,

  useListStockInQuery,
  useCreateStockInMutation,
  useGetStockInChallanQuery,

  useListStockOutQuery,
  useCreateStockOutMutation,
  useGetStockOutChallanQuery,

  useGetLedgerQuery,

  useGetPendingDemoReturnsQuery,
  useMarkDemoReturnMutation,
  useGetDemoReturnReportQuery,

  useGetTransfersQuery,
  useCreateTransferMutation,

  useCreateAdjustmentMutation,
} = inventoryApi;
