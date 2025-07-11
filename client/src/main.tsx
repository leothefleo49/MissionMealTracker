// client/src/main.tsx
import { createRoot } from "react-dom/client";
import { App } from "./App"; // Corrected: Changed to named import
import "./index.css";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error("Root element not found");
}