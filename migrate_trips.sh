#!/bin/bash
# ================================================
# DATA MIGRATION: cleaned_trip_data.csv → PostgreSQL trips table
# Usage: ./migrate_trips.sh
# ================================================

# ---- CONFIG ----
POD_NAME="postgres-deployment-6649dc9d78-fnzl7"
NAMESPACE="routeguardg-ns"
DB_NAME="techs"
DB_USER="postgres"
CSV_FILE="cleaned_trip_data.csv"
# ----------------

echo "Trip Data Migration Starting..."
echo "Pod: $POD_NAME"
echo "CSV: $CSV_FILE"
echo ""

# STEP 1: Table exist check
echo "Checking if trips table exists..."
kubectl exec -n $NAMESPACE $POD_NAME -- \
  psql -U $DB_USER -d $DB_NAME -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='trips';"

# STEP 2: CSV file pod mein copy karo
echo ""
echo "Copying CSV to pod..."
kubectl cp $CSV_FILE $NAMESPACE/$POD_NAME:/tmp/$CSV_FILE

if [ $? -ne 0 ]; then
  echo "CSV copy failed! Check file path."
  exit 1
fi
echo "CSV copied to /tmp/$CSV_FILE"

# STEP 3: Row count check
echo ""
echo "CSV row count:"
kubectl exec -n $NAMESPACE $POD_NAME -- wc -l /tmp/$CSV_FILE

# STEP 4: deviation_counter ka default 0 set karo
echo ""
echo "🔧 Setting deviation_counter default to 0..."
kubectl exec -n $NAMESPACE $POD_NAME -- \
  psql -U $DB_USER -d $DB_NAME -c \
  "ALTER TABLE trips ALTER COLUMN deviation_counter SET DEFAULT 0;"

# STEP 5: Migration using COPY command (fastest method)
echo ""
echo "⚡ Running migration via PostgreSQL COPY..."
kubectl exec -n $NAMESPACE $POD_NAME -- \
  psql -U $DB_USER -d $DB_NAME -c \
  "COPY trips (origin_lat, origin_lon, dest_lat, dest_lon, distancem, durations, polyline)
   FROM '/tmp/$CSV_FILE'
   WITH (FORMAT CSV, HEADER TRUE, DELIMITER ',');"

if [ $? -eq 0 ]; then
  echo ""
  echo "Migration SUCCESS!"
else
  echo ""
  echo "Migration FAILED! Check errors above."
  exit 1
fi

# STEP 6: Verify
echo ""
echo "Verifying inserted rows..."
kubectl exec -n $NAMESPACE $POD_NAME -- \
  psql -U $DB_USER -d $DB_NAME -c \
  "SELECT COUNT(*) as total_rows FROM trips;"

echo ""
echo "Sample 3 rows:"
kubectl exec -n $NAMESPACE $POD_NAME -- \
  psql -U $DB_USER -d $DB_NAME -c \
  "SELECT id, origin_lat, origin_lon, dest_lat, dest_lon, distancem, durations FROM trips LIMIT 3;"

# STEP 7: Cleanup
echo ""
echo "Cleaning up temp file..."
kubectl exec -n $NAMESPACE $POD_NAME -- rm /tmp/$CSV_FILE
echo "Done!"