import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "../components/shell.css";
import "../components/interactions.css";
import "../components/layout-fixes.css";
import "../components/admin-shell.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing React root element.");
}

createRoot(rootElement).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
