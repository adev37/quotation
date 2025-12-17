import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-grow bg-gray-50 min-h-screen overflow-auto ">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
