// src/app/store.js
import { configureStore } from '@reduxjs/toolkit';
import { inventoryApi } from '../services/inventoryApi';

export const store = configureStore({
  reducer: {
    [inventoryApi.reducerPath]: inventoryApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(inventoryApi.middleware),
});
