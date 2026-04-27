import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./router/ProtectedRoute";
import HomePage from "../pages/HomePage";
import ProtectedAppLayout from "./layout/ProtectedAppLayout";
import AppHomePage from "../pages/AppHomePage";

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
        element: <ProtectedAppLayout />,
        children: [
          {
            index: true,
            element: <AppHomePage />,
          },
        ],
      },
    ],
  },
]);
