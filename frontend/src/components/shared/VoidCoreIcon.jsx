import React from "react";

export const VoidCoreIcon = () => (
  <div style={{ position: "relative", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
    {/* Outer rotating cyber ring */}
    <div style={{
      position: "absolute",
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      border: "2px dashed #00DFD8",
      animation: "spin 8s linear infinite",
      opacity: 0.8
    }} />
    {/* Inner pulsating core */}
    <div style={{
      width: 12,
      height: 12,
      borderRadius: "50%",
      background: "radial-gradient(circle, #FFFFFF 0%, #7928CA 60%, #00DFD8 100%)",
      boxShadow: "0 0 10px #00DFD8, 0 0 20px #7928CA",
      animation: "pulse 1.4s ease-in-out infinite"
    }} />
  </div>
);
export default VoidCoreIcon;
