import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export const inventoryApi = createApi({
  reducerPath: "inventoryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,   // ✅ live backend in prod + dev (if env provided)
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
          ? [
              ...list.map((i) => ({ type: "Items", id: i._id })),
              { type: "Items", id: "LIST" },
            ]
          : [{ type: "Items", id: "LIST" }];
      },
    }),
    addItem: builder.mutation({
      query: (body) => ({ url: "/items", method: "POST", body }),
      invalidatesTags: [
        { type: "Items", id: "LIST" },
        { type: "CurrentStock", id: "SUMMARY" },
      ],
    }),
    updateItem: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/items/${id}`,
        method: "PUT",
        body,
      }),
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
          ? [
              ...result.map((w) => ({ type: "Warehouses", id: w._id })),
              { type: "Warehouses", id: "LIST" },
            ]
          : [{ type: "Warehouses", id: "LIST" }],
    }),
    addWarehouse: builder.mutation({
      query: (body) => ({ url: "/warehouses", method: "POST", body }),
      invalidatesTags: [{ type: "Warehouses", id: "LIST" }],
    }),
    updateWarehouse: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/warehouses/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (r, e, { id }) => [
        { type: "Warehouses", id },
        { type: "Warehouses", id: "LIST" },
      ],
    }),
    deleteWarehouse: builder.mutation({
      query: (id) => ({ url: `/warehouses/${id}`, method: "DELETE" }),
      invalidatesTags: (r, e, id) => [
        { type: "Warehouses", id },
        { type: "Warehouses", id: "LIST" },
      ],
    }),

    // ---------- LOCATIONS ----------
    getLocations: builder.query({
      query: () => "/locations",
      providesTags: (result) =>
        result
          ? [
              ...result.map((l) => ({ type: "Locations", id: l._id })),
              { type: "Locations", id: "LIST" },
            ]
          : [{ type: "Locations", id: "LIST" }],
    }),
    addLocation: builder.mutation({
      query: (body) => ({ url: "/locations", method: "POST", body }),
      invalidatesTags: [{ type: "Locations", id: "LIST" }],
    }),
    updateLocationByName: builder.mutation({
      query: ({ name, ...body }) => ({
        url: `/locations/by-name/${encodeURIComponent(name)}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Locations", id: "LIST" }],
    }),
    deleteLocation: builder.mutation({
      query: (id) => ({ url: `/locations/${id}`, method: "DELETE" }),
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

    // ✅ NEW: Rack Options for Stock Out dropdown (real locationId)
    getRackOptions: builder.query({
      query: ({ item, warehouse }) =>
        `/current-stock/rack-options?item=${encodeURIComponent(
          item
        )}&warehouse=${encodeURIComponent(warehouse)}`,
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
      query: (stockOutNo) =>
        `/stock-out/challan/${encodeURIComponent(stockOutNo)}`,
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
  useAddLocationMutation,
  useUpdateLocationByNameMutation,
  useDeleteLocationMutation,

  useGetCurrentStockQuery,
  useLazyGetCurrentStockQuery,
  useGetCurrentStockSummaryQuery,

  // ✅ NEW hook export
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
