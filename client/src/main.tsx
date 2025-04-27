import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

document.title = "Missionary Meal Calendar";

createRoot(root).render(<App />);
