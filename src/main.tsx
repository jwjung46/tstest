import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import AuthSessionBootstrap from "./app/providers/AuthSessionBootstrap";
import { router } from "./app/router";
import { initializeThemeSnapshot } from "./platform/theme/theme.ts";
import "./index.css";

initializeThemeSnapshot();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthSessionBootstrap />
    <RouterProvider router={router} />
  </StrictMode>,
);
