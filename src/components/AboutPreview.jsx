import React from "react";

export function AboutPreview({ isDark = false }) {
  const bg     = isDark ? "#ffffff" : "#000000";
  const ink    = isDark ?  "#111111" : "#f0f0f0";
  const muted  = isDark ?  "#777777" : "#999999";
  const border = isDark ?  "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
  const accent = "#B5121B";

  return (
    <div style={{
      width: "800px", height: "500px",
      background: bg, boxSizing: "border-box",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      color: ink, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "22px 40px",
        borderBottom: `1px solid ${border}`,
      }}>
        <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.04em" }}>
          VARUN&nbsp;<span style={{ color: accent }}>—</span>
        </div>
        <div style={{ display: "flex", gap: "28px", fontSize: "12px", letterSpacing: "0.08em", color: muted, textTransform: "uppercase" }}>
          <span>About</span>
          <span>Work</span>
          <span>Contact</span>
        </div>
      </div>

      <div style={{ padding: "84px 40px 0" }}>
        <div style={{
          fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
          color: accent, textTransform: "uppercase", marginBottom: "14px",
        }}>
          About — 01
        </div>

        <h1 style={{
          fontSize: "44px", margin: "0 0 28px 0", fontWeight: 800,
          letterSpacing: "-0.01em", lineHeight: 1.05,
        }}>
          Software engineer,<br />creative coder.
        </h1>

        <p style={{ fontSize: "16px", lineHeight: 1.7, color: muted, maxWidth: "480px" }}>
          Hey, I'm Varun — I like building creative, interactive experiences
          on the web. This is a placeholder About page used just to prove
          out the tunnel-reveal effect. Replace this content with your real
          bio, photo, and links whenever you're ready.
        </p>
      </div>

      <div style={{
        position: "absolute", bottom: "50px", left: "40px", right: "40px",
        borderTop: `1px solid ${border}`,
        paddingTop: "14px",
        display: "flex", justifyContent: "space-between",
        fontSize: "11px", color: muted, letterSpacing: "0.04em",
      }}>
        <span>© Varun</span>
        <span>Scroll to explore</span>
      </div>
    </div>
  );
}