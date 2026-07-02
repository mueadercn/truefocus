import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Socorro } from "./pages/Socorro";
import { Dashboard } from "./pages/Dashboard";
import { Deadlines } from "./pages/Deadlines";
import { Calendar } from "./pages/Calendar";
import { Notes } from "./pages/Notes";
import { Configuracoes } from "./pages/Configuracoes";
import { FocusClock } from "./pages/FocusClock";
import { Auth } from "./pages/Auth";
import AdminDebug from "./pages/AdminDebug";
import { FAQTeoria } from "./pages/FAQTeoria";
import { License } from "./pages/License";
import { Goals } from "./pages/Goals";
import { LandingPage } from "../landing-page/LandingPage";
import { AdminDashboard } from "../landing-page/AdminDashboard";

// Error Boundary Component
function ErrorBoundary() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0A0A0A] flex items-center justify-center p-5">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-light tracking-tight text-[#1A1A1A] dark:text-[#F5F5F5] mb-4">
          TrueFocus
        </h1>
        <p className="text-[#6B6B6B] dark:text-[#A0A0A0] mb-6">
          Algo deu errado. Recarregue a página.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-[#8B7355] text-white rounded-lg hover:bg-[#A89580] transition-colors"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: "/",
        element: <Auth /> // Página inicial agora é login/signup
      },
      {
        path: "/auth",
        element: <Auth />
      },
      {
        path: "/home",
        element: <Layout />,
        children: [
          { index: true, Component: Home },
          { path: "goals", Component: Goals },
          { path: "socorro", Component: Socorro },
          { path: "dashboard", Component: Dashboard },
          { path: "deadlines", Component: Deadlines },
          { path: "calendario", Component: Calendar },
          { path: "anotacoes", Component: Notes },
          { path: "configuracoes", Component: Configuracoes },
          { path: "focus-clock", Component: FocusClock },

          { path: "faq-teoria", Component: FAQTeoria },
          { path: "licenca", Component: License },
        ],
      },
      {
        path: "/admin-debug",
        element: <AdminDebug />
      },
      {
        path: "/landing",
        element: <LandingPage />
      },
      {
        path: "/landing-admin",
        element: <AdminDashboard />
      },
      {
        path: "*",
        element: <Navigate to="/auth" replace /> // Redireciona qualquer rota inválida para login
      }
    ]
  }
]);