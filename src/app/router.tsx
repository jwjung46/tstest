import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./router/ProtectedRoute";
import AppPage from "../pages/AppPage";
import HomePage from "../pages/HomePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/app",
    element: <ProtectedRoute />,
    children: [
      {
        index: true,
        element: <AppPage />,
      },
    ],
  },
]);
