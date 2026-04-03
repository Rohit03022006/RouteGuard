CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    origin_lat DOUBLE PRECISION,
    origin_lon DOUBLE PRECISION,
    dest_lat DOUBLE PRECISION,
    dest_lon DOUBLE PRECISION,
    distance_m DOUBLE PRECISION,
    duration_s DOUBLE PRECISION,
    polyline TEXT,
    status VARCHAR(50) DEFAULT 'ONGOING',
    deviation_counter INT DEFAULT 0,
    last_location_lat DOUBLE PRECISION,
    last_location_lon DOUBLE PRECISION
);

COPY trips(origin_lat, origin_lon, dest_lat, dest_lon, distance_m, duration_s, polyline)
FROM '/docker-entrypoint-initdb.d/trip_data.csv'
DELIMITER ','
CSV HEADER;