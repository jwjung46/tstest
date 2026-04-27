import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./router/ProtectedRoute";
import HomePage from "../pages/HomePage";
import ProtectedAppLayout from "./layout/ProtectedAppLayout";
import AppHomePage from "../pages/AppHomePage";
import AppAccountPage from "../pages/AppAccountPage";
import { APP_ROUTE_SEGMENTS } from "./router/paths";

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
          {
            path: APP_ROUTE_SEGMENTS.account,
            element: <AppAccountPage />,
          },
        ],
      },
    ],
  },
]);
