COPY trips(
    origin_lat,
    origin_lon,
    dest_lat,
    dest_lon,
    distance_m,
    duration_s,
    polyline
)
FROM PROGRAM 'cut -d, -f2- /docker-entrypoint-initdb.d/trip_data.csv'
DELIMITER ','
CSV HEADER;