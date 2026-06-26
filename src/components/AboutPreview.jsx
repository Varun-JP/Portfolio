import React from "react";

// This renders off-screen (see how it's mounted in Landing.jsx) purely so
// html2canvas can snapshot it into a texture for the 3D plane in the tunnel.
// Swap this content for your real About Me page whenever you're ready —
// the capture logic doesn't care what's inside, just the fixed dimensions.
export function AboutPreview() {
  return (
    <div
      style={{
        width: "800px",
        height: "500px",
        background: "#ffffff",
        boxSizing: "border-box",
        padding: "48px",
        fontFamily: "sans-serif",
        color: "#111111",
      }}
    >
      <h1 style={{ fontSize: "40px", margin: "0 0 16px 0", fontWeight: 800 }}>
        About Me
      </h1>
      <p style={{ fontSize: "18px", lineHeight: 1.6, color: "#333333", maxWidth: "600px" }}>
        Hey, I'm Varun — a software engineer who likes building creative,
        interactive experiences on the web. This is a placeholder About page
        used just to prove out the tunnel-reveal effect. Replace this content
        with your real bio, photo, and links whenever you're ready.
      </p>
    </div>
  );
}
