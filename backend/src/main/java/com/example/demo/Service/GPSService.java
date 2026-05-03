package com.example.demo.Service;

import java.time.LocalDateTime;

import com.example.demo.Entity.GPS;
import com.example.demo.Entity.Trip;
import com.example.demo.Repository.GPSRepo;
import com.example.demo.Repository.TripRepo;

import org.springframework.stereotype.Service;

@Service
public class GPSService {

    private final TripRepo tripRepo;
    private final GPSRepo gpsRepo;
    private final DeviationService deviationService;

    public GPSService(
            TripRepo tripRepo,
            GPSRepo gpsRepo,
            DeviationService deviationService) {
        this.tripRepo = tripRepo;
        this.gpsRepo = gpsRepo;
        this.deviationService = deviationService;
    }

    public void processGps(Long tripId, Double lat, Double lon) {

        Trip trip = tripRepo.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        // ✅ GPS DRIFT CORRECTION
        // If the jump is more than 5km in one update, it's likely a GPS error
        if (trip.getLastLocationLat() != null && trip.getLastLocationLon() != null) {
            double distance = calculateDistance(trip.getLastLocationLat(), trip.getLastLocationLon(), lat, lon);
            if (distance > 5.0) {
                System.out.println("GPS DRIFT DETECTED: Ignoring point [" + lat + ", " + lon + "]");
                return;
            }
        }

        // ✅ 1. Save GPS log (history)
        GPS log = new GPS();
        log.setLatitude(lat);
        log.setLongitude(lon);
        log.setTimestamp(LocalDateTime.now());
        log.setTrip(trip);
        gpsRepo.save(log);

        // Update Live Location
        trip.setLastLocationLat(lat);
        trip.setLastLocationLon(lon);

        tripRepo.save(trip);
        
        // ✅ Real-Time ML Anomaly Check
        try {
            deviationService.checkTripWithML(trip);
        } catch (Exception e) {
            System.err.println("ML Check failed: " + e.getMessage());
        }
    }

    public java.util.List<GPS> getHistory(Long tripId) {
        return gpsRepo.findByTripIdOrderByTimestampAsc(tripId);
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double theta = lon1 - lon2;
        double dist = Math.sin(Math.toRadians(lat1)) * Math.sin(Math.toRadians(lat2))
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.cos(Math.toRadians(theta));
        dist = Math.acos(dist);
        dist = Math.toDegrees(dist);
        dist = dist * 60 * 1.1515 * 1.609344; // to kilometers
        return dist;
    }

    // Call this when trip ends
    public void completeTrip(Long tripId) {
        Trip trip = tripRepo.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));
        deviationService.checkTripWithML(trip);
    }
}