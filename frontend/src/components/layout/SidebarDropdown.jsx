import React, { useState, useRef } from "react";

const SidebarDropdown = ({ icon, title, children }) => {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 50);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <div className="cursor-pointer px-4 py-2 flex items-center rounded hover:bg-blue-100">
        <span className="mr-2">{icon}</span>
        <span>{title}</span>
        <span className="ml-auto">▸</span>
      </div>

      {open && (
        <div className="absolute left-full top-0 ml-1 w-56 bg-white border rounded shadow-lg z-50">
          {children}
        </div>
      )}
    </div>
  );
};

export default SidebarDropdown;
