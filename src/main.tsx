import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("[v0] Starting Vite React app...");
console.log("[v0] Root element found:", document.getElementById("root"));

createRoot(document.getElementById("root")!).render(<App />);

console.log("[v0] App rendered successfully!");
