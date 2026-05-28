import "./index.css";
import "./reellab.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
          <Route path="/ceo" element={<Protected requireLegal={false}><HelpBotWrapper><CEOBackOffice /></HelpBotWrapper></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
