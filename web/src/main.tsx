import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { API_ORIGIN } from "./lib/api";
import "./index.css";

// The generated client requests relative paths like /api/reports. Same-origin
// in dev (Vite proxies them); in production they need the Railway origin
// prepended. Cookies still ride along — customFetch always sends credentials.
if (API_ORIGIN) {
  setBaseUrl(API_ORIGIN);
}

createRoot(document.getElementById("root")!).render(<App />);
