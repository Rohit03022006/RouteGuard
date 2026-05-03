import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import './index.css';
import SkeletonLoader from './components/SkeletonLoader';

const LandingPage = lazy(() => import('./components/LandingPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const RegisterTruck = lazy(() => import('./components/RegisterTruck'));
const TruckDetailPage = lazy(() => import('./components/TruckDetailPage'));

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-brand-lightest text-brand-darkest selection:bg-brand-steel selection:text-white">
        <Suspense fallback={<SkeletonLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/register-truck" element={<RegisterTruck />} />
            <Route path="/truck/:id" element={<TruckDetailPage />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
