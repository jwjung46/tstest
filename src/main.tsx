import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import AuthSessionBootstrap from "./app/providers/AuthSessionBootstrap";
import { router } from "./app/router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthSessionBootstrap />
    <RouterProvider router={router} />
  </StrictMode>,
);
