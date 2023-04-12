import React from "react";

export const ToolTitleArea: React.FC = ({ children }) => {
  // console.log("tile-title-area.tsx > with children:", children);
  return (
    <div className="title-area-wrapper" key="title-area">
      <div className="title-area">
        { children }
      </div>
    </div>
  );
};


