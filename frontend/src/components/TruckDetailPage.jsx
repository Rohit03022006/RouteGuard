import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../config/api';
import TruckDetail from './dashboard/TruckDetail';
import Header from './dashboard/Header';
import { Loader, AlertTriangle } from 'lucide-react';

const Haversine = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const R = 6371e3;
    const phi1 = p1[0] * Math.PI / 180;
    const phi2 = p2[0] * Math.PI / 180;
    const dPhi = (p2[0] - p1[0]) * Math.PI / 180;
    const dLambda = (p2[1] - p1[1]) * Math.PI / 180;
    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const TruckDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const rawId = id.replace('TRK-', '');

    const [truck, setTruck] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [realRouteData, setRealRouteData] = useState(null);
    const [isCompleted, setIsCompleted] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [truckData, historyData] = await Promise.all([
                API.trucks.getById(rawId),
                API.gps.getHistory(rawId)
            ]);
            setTruck(truckData);
            setHistory(historyData);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Failed to sync live data");
        } finally {
            setLoading(false);
        }
    }, [rawId]);

    // Polling every 2 seconds
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading && !truck) {
        return (
            <div className="flex h-screen bg-brand-lightest">
                <main className="flex-1 flex flex-col">
                    <Header />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <Loader className="w-10 h-10 animate-spin text-brand-deep" />
                            <p className="text-brand-steel text-sm font-black uppercase tracking-widest">Establishing Satellite Link...</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error && !truck) {
        return (
            <div className="flex h-screen bg-brand-lightest">
                <main className="flex-1 flex flex-col">
                    <Header />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="bg-red-50 p-6 rounded-xl text-center">
                            <AlertTriangle className="text-red-500 mx-auto mb-3" />
                            <p className="text-red-700 font-semibold">{error}</p>
                            <button onClick={() => navigate('/dashboard')} className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg">Back to Dashboard</button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const handleAnimationComplete = async () => {
        setIsCompleted(true);
        if (truck?.trip?.id) {
            try {
                // Send the updated status to the backend
                await API.trips.update(truck.trip.id, { ...truck.trip, status: "COMPLETED" });
            } catch(e) {
                console.error("Failed to update trip status:", e);
            }
        }
    };

    const trip = truck?.trip || {};
    
    const isValidCoord = (c) => typeof c === 'number' && !isNaN(c);
    const lastLat = isValidCoord(trip.lastLocationLat) ? trip.lastLocationLat : (isValidCoord(trip.originLat) ? trip.originLat : 28.8571);
    const lastLon = isValidCoord(trip.lastLocationLon) ? trip.lastLocationLon : (isValidCoord(trip.originLon) ? trip.originLon : 76.827);
    const destLat = isValidCoord(trip.destLat) ? trip.destLat : 28.5828;
    const destLon = isValidCoord(trip.destLon) ? trip.destLon : 77.3988;

    const lastPos = [lastLat, lastLon];
    const destPos = [destLat, destLon];
    
    const distRemainingM = Haversine(lastPos, destPos);
    const speedKmh = 60; // Assumed average speed for ETA
    const etaHours = (distRemainingM / 1000) / speedKmh;
    
    // Efficiency calculation
    const plannedDistM = trip.distanceM || distRemainingM;
    const efficiency = plannedDistM > 0 ? Math.min(100, (plannedDistM / (plannedDistM + (trip.deviationCounter * 500))) * 100).toFixed(1) : "94.8";

    const rawTruckId = truck?.truckId || truck?.id;
    const safeId = rawTruckId ? (rawTruckId.toString().startsWith("TRK-") ? rawTruckId : `TRK-${rawTruckId}`) : id;

    const isDeviated = trip.status === "DEVIATED";

    // Format Duration and Distance either from Haversine or from realRouteData
    let formattedDistance = `${(distRemainingM / 1000).toFixed(1)} km`;
    let formattedDuration = etaHours < 1 ? `${Math.round(etaHours * 60)}m` : `${Math.floor(etaHours)}h ${Math.round((etaHours % 1) * 60)}m`;

    if (realRouteData) {
        formattedDistance = `${(realRouteData.totalDistance / 1000).toFixed(1)} km`;
        const totalMinutes = Math.round(realRouteData.totalTime / 60);
        formattedDuration = totalMinutes < 60 ? `${totalMinutes}m` : `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
    }

    const transformedTruck = {
        id: safeId,
        driver: truck?.pilotName || "Unknown",
        status: isCompleted ? "COMPLETED" : (trip.status || "On Route"),
        lastLocation: lastPos,
        destination: destPos,
        distance: formattedDistance,
        duration: formattedDuration,
        deviation: isDeviated,
        risk: isDeviated ? 95 : 5, // Simulated risk based on ML anomaly output
        polyline: trip.polyline || "",
        efficiency: `${efficiency}%`,
        history: history || []
    };

    return (
        <div className="flex h-screen bg-brand-lightest overflow-hidden">
            <main className="flex-1 flex flex-col">
                <Header />
                <div className="flex-1 overflow-y-auto p-8">
                    <TruckDetail 
                        selectedTruck={transformedTruck} 
                        setSelectedTruck={() => navigate('/dashboard')} 
                        onRouteData={setRealRouteData}
                        onAnimationComplete={handleAnimationComplete}
                    />
                </div>
            </main>
        </div>
    );
};

export default TruckDetailPage;
