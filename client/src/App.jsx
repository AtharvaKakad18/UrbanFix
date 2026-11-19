import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

// Contexts
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

// Components & Layout
import { Navbar } from './components/layout/Navbar.jsx';
import { BottomNav } from './components/layout/BottomNav.jsx';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { ProtectedRoute } from './router/ProtectedRoute.jsx';

// Pages
import { LandingPage } from './pages/LandingPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { CitizenDashboard } from './pages/CitizenDashboard.jsx';
import { CreateReportPage } from './pages/CreateReportPage.jsx';
import { MyReportsPage } from './pages/MyReportsPage.jsx';
import { ReportDetailsPage } from './pages/ReportDetailsPage.jsx';
import { LiveMapPage } from './pages/LiveMapPage.jsx';
import { DepartmentDashboard } from './pages/DepartmentDashboard.jsx';
import { PoliceDashboard } from './pages/PoliceDashboard.jsx';
import { AdminDashboard } from './pages/AdminDashboard.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { ForbiddenPage } from './pages/ForbiddenPage.jsx';

import api from './services/api.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

// Cold-start notification banner for cloud deployment (e.g. Render free tier spinning up)
const ColdStartBanner = () => {
  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
    // Never show cold start banner on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return;
    }

    let timeout = setTimeout(() => {
      setIsWakingUp(true);
    }, 3000);

    api.get('/health')
      .then(() => {
        clearTimeout(timeout);
        setIsWakingUp(false);
      })
      .catch(() => {
        // still starting up
      });

    return () => clearTimeout(timeout);
  }, []);

  if (!isWakingUp) return null;

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2">
      <div className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
      <span>Connecting to cloud backend... Free web services may take 30–50s to wake up from cold start.</span>
    </div>
  );
};

// Main App Layout Shell
const AppLayout = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isStaffOrAdminRoute =
    location.pathname.startsWith('/department') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/police');
  const isMapRoute = location.pathname === '/map';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <ColdStartBanner />
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Render desktop sidebar if on Staff/Admin/Police routes and user has privileges */}
        {isStaffOrAdminRoute && (user?.role === 'staff' || user?.role === 'admin' || user?.role === 'police') && (
          <Sidebar />
        )}

        <main className={`flex-1 overflow-y-auto ${isMapRoute ? '' : 'pb-20 md:pb-8'}`}>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<LoginPage initialPortal="admin" />} />
            <Route path="/department/login" element={<LoginPage initialPortal="staff" />} />
            <Route path="/police/login" element={<LoginPage initialPortal="police" />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/map" element={<LiveMapPage />} />
            <Route path="/reports/:id" element={<ReportDetailsPage />} />

            {/* Citizen Protected Pages */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['citizen', 'staff', 'admin']}>
                  <CitizenDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report/new"
              element={
                <ProtectedRoute roles={['citizen', 'staff', 'admin']}>
                  <CreateReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute roles={['citizen', 'staff', 'admin']}>
                  <MyReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Department Staff & Admin Pages */}
            <Route
              path="/department"
              element={
                <ProtectedRoute roles={['staff', 'admin']}>
                  <DepartmentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Police Dashboard Pages */}
            <Route
              path="/police"
              element={
                <ProtectedRoute roles={['police', 'admin']}>
                  <PoliceDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/police/*"
              element={
                <ProtectedRoute roles={['police', 'admin']}>
                  <PoliceDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin Only Console */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Common User Account Pages */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Errors */}
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>

      {/* Mobile-only Bottom Tab Navigation */}
      <BottomNav />
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
