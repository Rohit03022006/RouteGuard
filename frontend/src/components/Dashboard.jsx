import React, { useState, useEffect, useCallback } from "react";
import API from "../config/api";
import { Truck, AlertTriangle, TrendingUp, Clock, Loader } from "lucide-react";
import Header from "./dashboard/Header";
import StatCard from "./dashboard/StatCard";
import TruckTable from "./dashboard/TruckTable";
import AnalyticsChart from "./dashboard/AnalyticsChart";
import FleetMap from "./dashboard/FleetMap";
import { analyticsData, summaryStats } from "../data/mockData";
import { useAnalytics } from "../hooks/useAPI";
import SkeletonLoader from "./SkeletonLoader";


const transformTrucks = (data) =>
  data.map((truck, index) => {
    const trip = truck.trip || {};
    const hours = trip.durationS ? Math.floor(trip.durationS / 3600) : 0;
    const minutes = trip.durationS
      ? Math.floor((trip.durationS % 3600) / 60)
      : 0;
    const rawId = truck.truckId || truck.id;
    const safeId = rawId ? (rawId.toString().startsWith("TRK-") ? rawId : `TRK-${rawId}`) : `TRK-${index + 1}`;
    
    // Ensure valid coordinates
    const isValidCoord = (c) => typeof c === 'number' && !isNaN(c);
    const lastLat = isValidCoord(trip.lastLocationLat) ? trip.lastLocationLat : (isValidCoord(trip.originLat) ? trip.originLat : 28.8571);
    const lastLon = isValidCoord(trip.lastLocationLon) ? trip.lastLocationLon : (isValidCoord(trip.originLon) ? trip.originLon : 76.827);
    const destLat = isValidCoord(trip.destLat) ? trip.destLat : 28.5828;
    const destLon = isValidCoord(trip.destLon) ? trip.destLon : 77.3988;

    return {
      id: safeId,
      driver: truck.pilotName || "Unknown",
      status: trip.status || "On Route",
      lastLocation: [lastLat, lastLon],
      destination: [destLat, destLon],
      distance: trip.distanceM
        ? `${(trip.distanceM / 1000).toFixed(1)} km`
        : "N/A",
      duration: trip.durationS ? `${hours}h ${minutes}m` : "N/A",
      deviation: trip.status === "DEVIATED",
      risk: trip.riskScore || 0,
      polyline: trip.polyline || "",
    };
  });

const Dashboard = () => {
  const [displayTrucks, setDisplayTrucks] = useState([]);
  const [displayStats, setDisplayStats] = useState(summaryStats);
  const [displayAnalytics, setDisplayAnalytics] = useState(analyticsData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    data: backendAnalytics,
    loading: analyticsLoading,
  } = useAnalytics();

  const fetchAndUpdate = useCallback(async () => {
    try {
      const data = await API.trucks.getAll();
      const transformed = transformTrucks(data);
      setDisplayTrucks(transformed);
      setDisplayStats({
        totalTrucks: transformed.length,
        deviatedTrucks: transformed.filter((t) => t.deviation).length,
        completedTrips: transformed.length,
        avgOnTimeDelivery:
          transformed.length > 0
            ? `${Math.round(
                ((transformed.length -
                  transformed.filter((t) => t.deviation).length) /
                  transformed.length) *
                  100
              )}%`
            : "N/A",
      });
      setError(null);
    } catch (err) {
      console.error(err);
      // Only set error if we don't have any data yet, to prevent flashing UI on polling errors
      if (displayTrucks.length === 0) {
        setError("Failed to load fleet data");
      }
    } finally {
      setLoading(false);
    }
  }, [displayTrucks.length]);

  // Fetch immediately on mount
  useEffect(() => {
    fetchAndUpdate();
  }, [fetchAndUpdate]);

  // Then poll every 2s for live updates (requested for real-time tracking)
  useEffect(() => {
    const interval = setInterval(fetchAndUpdate, 2000);
    return () => clearInterval(interval);
  }, [fetchAndUpdate]);

  useEffect(() => {
    if (backendAnalytics && Array.isArray(backendAnalytics)) {
      setDisplayAnalytics(backendAnalytics);
    }
  }, [backendAnalytics]);

  if (loading || analyticsLoading || error) {
    return <SkeletonLoader />;
  }

  return (
    <div className="flex h-screen bg-brand-lightest">
      <main className="flex-1 flex flex-col">
        <Header />

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* FLEET MAP VIEW */}
          {displayTrucks.length > 0 && <FleetMap trucks={displayTrucks} />}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="Total Fleet"
              value={displayStats.totalTrucks}
              icon={<Truck className="text-brand-deep" />}
            />
            <StatCard
              label="Active Deviations"
              value={displayStats.deviatedTrucks}
              icon={<AlertTriangle className="text-red-500" />}
              critical
            />
            <StatCard
              label="Trips Today"
              value={displayStats.completedTrips}
              icon={<Clock />}
            />
            <StatCard
              label="Efficiency"
              value={displayStats.avgOnTimeDelivery}
              icon={<TrendingUp />}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-start min-h-[450px]">
            {displayTrucks.length === 0 ? (
              <div className="lg:col-span-2 flex items-center justify-center bg-white rounded-3xl border border-brand-sage/20 p-12 text-center">
                <div>
                  <Truck className="w-12 h-12 text-brand-steel/30 mx-auto mb-4" />
                  <p className="text-brand-steel font-semibold">No trucks registered</p>
                  <p className="text-sm text-brand-steel/60 mt-1">
                    Go to <a href="/register-truck" className="text-brand-deep underline">Register Truck</a> to add your fleet.
                  </p>
                </div>
              </div>
            ) : (
              <TruckTable trucksData={displayTrucks} />
            )}
            <AnalyticsChart analyticsData={displayAnalytics} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
