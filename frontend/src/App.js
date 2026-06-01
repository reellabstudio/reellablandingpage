import "./index.css";
import "./reellab.css";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import HelpBot from "./components/HelpBot";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LegalGate from "./pages/LegalGate";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import NewProjectWizard from "./pages/NewProjectWizard";
import ProjectDetail from "./pages/ProjectDetail";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import AIEditor from "./pages/AIEditor";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import CEOBackOffice from "./pages/CEOBackOffice";
import FounderCheckout from "./pages/FounderCheckout";
import AffiliateHub from "./pages/AffiliateHub";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ContentStudio from "./pages/ContentStudio";

function Protected({ children, requireLegal = true }) {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div className="spinner" />
      </div>
    );
  }
  if (user === null) return <Navigate to="/login" replace />;
  if (requireLegal && !user.legal_accepted && user.role !== "ceo") return <Navigate to="/legal" replace />;
  return children;
}

function AppShell({ children }) {
  return (
    <Layout>
      {children}
      <HelpBot />
    </Layout>
  );
}

function HelpBotWrapper({ children }) {
  return (
    <>
      {children}
      <HelpBot />
    </>
  );
}

// Capture ?ref=CODE on any page and stash in localStorage for 30 days
function RefCapture() {
  const location = useLocation();
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const ref = sp.get("ref");
    if (ref) {
      localStorage.setItem("rl_ref", JSON.stringify({ code: ref, ts: Date.now() }));
    }
  }, [location.search]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RefCapture />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/founder-checkout" element={<FounderCheckout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/legal" element={<Protected requireLegal={false}><LegalGate /></Protected>} />

          <Route path="/dashboard" element={<Protected><AppShell><Dashboard /></AppShell></Protected>} />
          <Route path="/projects" element={<Protected><AppShell><Projects /></AppShell></Protected>} />
          <Route path="/projects/new" element={<Protected><AppShell><NewProjectWizard /></AppShell></Protected>} />
          <Route path="/projects/:id" element={<Protected><AppShell><ProjectDetail /></AppShell></Protected>} />
          <Route path="/clients" element={<Protected><AppShell><Clients /></AppShell></Protected>} />
          <Route path="/invoices" element={<Protected><AppShell><Invoices /></AppShell></Protected>} />
          <Route path="/invoices/new" element={<Protected><AppShell><Invoices /></AppShell></Protected>} />
          <Route path="/editor" element={<Protected><AppShell><AIEditor /></AppShell></Protected>} />
          <Route path="/community" element={<Protected><AppShell><Community /></AppShell></Protected>} />
          <Route path="/profile" element={<Protected><AppShell><Profile /></AppShell></Protected>} />
          <Route path="/sparks" element={<Protected><AppShell><AffiliateHub /></AppShell></Protected>} />
          <Route path="/content-studio" element={<Protected><AppShell><ContentStudio /></AppShell></Protected>} />
          <Route path="/ceo" element={<Protected requireLegal={false}><HelpBotWrapper><CEOBackOffice /></HelpBotWrapper></Protected>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
