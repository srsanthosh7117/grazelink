import { useState, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Splash from '@/pages/Splash/Splash';
import DashboardLayout from '@/pages/Dashboard/DashboardLayout';
import { PrivacyPolicy, Terms } from '@/pages/Legal/Legal';
import ProtectedRoute from '@/components/ProtectedRoute';

const Home = lazy(() => import('@/pages/Home/Home'));
const Login = lazy(() => import('@/pages/Login/Login'));
const Register = lazy(() => import('@/pages/Register/Register'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail/VerifyEmail'));
const DeviceRegistration = lazy(() => import('@/pages/DeviceRegistration/DeviceRegistration'));
const Overview = lazy(() => import('@/pages/Dashboard/Overview'));
const Livestock = lazy(() => import('@/pages/Dashboard/Livestock'));
const AddLivestock = lazy(() => import('@/pages/Dashboard/AddLivestock'));
const LivestockDetail = lazy(() => import('@/pages/Dashboard/LivestockDetail'));
const GPSTracking = lazy(() => import('@/pages/Dashboard/GPSTracking'));
const Reports = lazy(() => import('@/pages/Dashboard/Reports'));
const Analytics = lazy(() => import('@/pages/Dashboard/Analytics'));
const Alerts = lazy(() => import('@/pages/Dashboard/Alerts'));
const Devices = lazy(() => import('@/pages/Dashboard/Devices'));
const Settings = lazy(() => import('@/pages/Dashboard/Settings'));
const AccountCenter = lazy(() => import('@/pages/Dashboard/AccountCenter'));

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <Splash onComplete={() => setShowSplash(false)} />;
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/register-device"
          element={
            <ProtectedRoute>
              <DeviceRegistration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="livestock" element={<Livestock />} />
          <Route path="livestock/add" element={<AddLivestock />} />
          <Route path="livestock/:livestockId" element={<LivestockDetail />} />
          <Route path="gps" element={<GPSTracking />} />
          <Route path="reports" element={<Reports />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="devices" element={<Devices />} />
          <Route path="settings" element={<Settings />} />
          <Route path="account" element={<AccountCenter />} />
        </Route>
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>
    </Suspense>
  );
}
