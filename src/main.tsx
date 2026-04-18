import { StrictMode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import AuthSessionBootstrap from "./app/providers/AuthSessionBootstrap";
import { appQueryClient } from "./app/providers/query-client.ts";
import { router } from "./app/router";
import { initializeThemeSnapshot } from "./platform/theme/theme.ts";
import "./index.css";

initializeThemeSnapshot();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={appQueryClient}>
      <AuthSessionBootstrap />
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
