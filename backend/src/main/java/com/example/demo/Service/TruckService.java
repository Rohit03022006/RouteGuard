package com.example.demo.Service;

import java.util.List;

import com.example.demo.Entity.DTO.TruckRequest;

import org.springframework.stereotype.Service;

import com.example.demo.Entity.Trip;
import com.example.demo.Entity.Truck;
import com.example.demo.Repository.TripRepo;
import com.example.demo.Repository.TruckRepo;

@Service
public class TruckService {
    private final TruckRepo truckRepository;
    private final TripRepo routeRepository;

    public TruckService(TruckRepo truckRepository, TripRepo routeRepository) {
        this.truckRepository = truckRepository;
        this.routeRepository = routeRepository;
    }

    public Truck registerTruck(TruckRequest req) {

        Trip templateRoute = routeRepository.findById(req.getRouteId())
                .orElseThrow(() -> new RuntimeException("Route not found"));

        Trip newTrip = new Trip();
        newTrip.setOriginLat(templateRoute.getOriginLat());
        newTrip.setOriginLon(templateRoute.getOriginLon());
        newTrip.setDestLat(templateRoute.getDestLat());
        newTrip.setDestLon(templateRoute.getDestLon());
        newTrip.setDistanceM(templateRoute.getDistanceM());
        newTrip.setDurationS(templateRoute.getDurationS());
        newTrip.setPolyline(templateRoute.getPolyline());
        newTrip.setStatus(com.example.demo.Entity.TripStatus.ONGOING);

        // ✅ SET INITIAL COORDINATES IF PROVIDED
        if (req.getStartLat() != null && req.getStartLon() != null) {
            newTrip.setLastLocationLat(req.getStartLat());
            newTrip.setLastLocationLon(req.getStartLon());
        } else {
            // Default to origin if not provided
            newTrip.setLastLocationLat(templateRoute.getOriginLat());
            newTrip.setLastLocationLon(templateRoute.getOriginLon());
        }

        newTrip = routeRepository.save(newTrip);

        Truck truck = Truck.builder()
                .truckId(req.getTruckId())
                .pilotName(req.getDriver())
                .status("Registered")
                .trip(newTrip)
                .build();

        return truckRepository.save(truck);
    }

    public List<Truck> getAllTrucks() {

        return truckRepository.findAll();
    }

    public Truck getTruckById(String id) {
        return truckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Truck not found with id: " + id));
    }

}