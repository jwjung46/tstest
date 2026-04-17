import { createBrowserRouter } from "react-router-dom";
import AppPage from "../pages/AppPage";
import HomePage from "../pages/HomePage";
import ProtectedRoute from "../routes/ProtectedRoute";

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
