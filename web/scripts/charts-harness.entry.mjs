import { createElement } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";

// Every example the Chart part ships, in file order, so a new one is shot with no edit here.
const EXAMPLES = import.meta.glob("/src/ds/organisms/chart/*.example.tsx", { eager: true });

const parts = Object.entries(EXAMPLES)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, mod]) => createElement("section", { key: path, "data-example": path.split("/").pop() }, createElement(mod.default)));

createRoot(document.getElementById("root")).render(createElement("main", { className: "p-4" }, parts));
