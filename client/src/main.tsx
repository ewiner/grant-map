import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Redirect legacy hash routes (e.g. /#/ or /#/chapter/5) to clean paths
if (window.location.hash.startsWith("#/")) {
  const path = window.location.hash.slice(1); // strip the #
  window.history.replaceState(null, "", path);
}

createRoot(document.getElementById("root")!).render(<App />);
