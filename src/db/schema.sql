-- ==============================================================================
-- NAVAL SENTINEL: PRODUCTION-GRADE POSTGRESQL + POSTGIS SPATIAL DATABASE SCHEMA
-- Geodetic Maritime Telemetry, Defense Exclusion Geofences & SAR Radar Detection
-- ==============================================================================

-- 1. Enable Spatial Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 2. Vessels Metadata Table
CREATE TABLE IF NOT EXISTS vessels (
    mmsi VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    imo VARCHAR(20),
    callsign VARCHAR(50),
    vessel_type VARCHAR(50) NOT NULL,
    flag_country VARCHAR(100) NOT NULL,
    length_m NUMERIC(8, 2),
    width_m NUMERIC(8, 2),
    is_sanctioned BOOLEAN DEFAULT FALSE,
    watchlist_status VARCHAR(50) DEFAULT 'CLEAR',
    sanction_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. High-Frequency AIS Telemetry & Historical Kinematics Table
CREATE TABLE IF NOT EXISTS vessel_tracks (
    id SERIAL PRIMARY KEY,
    mmsi VARCHAR(20) REFERENCES vessels(mmsi) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    speed_knots NUMERIC(6, 2) NOT NULL,
    heading_deg NUMERIC(6, 2) NOT NULL,
    nav_status VARCHAR(50) DEFAULT 'underway_engine',
    -- PostGIS Point Geometry in WGS-84 (SRID 4326)
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Defense Geofence & Maritime Boundaries Table
CREATE TABLE IF NOT EXISTS defense_zones (
    id VARCHAR(100) PRIMARY KEY,
    zone_name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(50) NOT NULL, -- 'naval_restricted', 'eez', 'chokepoint'
    risk_level VARCHAR(50) NOT NULL, -- 'HIGH', 'CRITICAL', 'MONITOR'
    description TEXT,
    -- PostGIS Polygon Geometry in WGS-84 (SRID 4326)
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Satellite Synthetic Aperture Radar (SAR) Detections Table
CREATE TABLE IF NOT EXISTS sar_detections (
    id VARCHAR(100) PRIMARY KEY,
    source_scene_id VARCHAR(255) NOT NULL,
    modality VARCHAR(50) DEFAULT 'sar_sentinel1',
    timestamp TIMESTAMPTZ NOT NULL,
    estimated_length_m NUMERIC(8, 2),
    estimated_width_m NUMERIC(8, 2),
    confidence NUMERIC(4, 3) NOT NULL,
    polarization VARCHAR(20) DEFAULT 'VV',
    is_dark_vessel BOOLEAN DEFAULT TRUE,
    matched_mmsi VARCHAR(20) REFERENCES vessels(mmsi),
    -- PostGIS Point Geometry in WGS-84 (SRID 4326)
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Spatial Indexes (GIST) for Microsecond Geodetic Lookups
CREATE INDEX IF NOT EXISTS idx_vessel_tracks_geom ON vessel_tracks USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_defense_zones_geom ON defense_zones USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_sar_detections_geom ON sar_detections USING GIST(geom);

-- Temporal Indexes for Simulation Time Window Slicing
CREATE INDEX IF NOT EXISTS idx_vessel_tracks_timestamp ON vessel_tracks(timestamp);
CREATE INDEX IF NOT EXISTS idx_vessel_tracks_mmsi_time ON vessel_tracks(mmsi, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sar_detections_timestamp ON sar_detections(timestamp);

-- ==============================================================================
-- INITIAL SEED DATA: ARABIAN SEA MARITIME SECTOR (SAURASHTRA / GULF OF KUTCH)
-- ==============================================================================

-- Seed Vessels
INSERT INTO vessels (mmsi, name, imo, callsign, vessel_type, flag_country, length_m, width_m, is_sanctioned, watchlist_status, sanction_details)
VALUES 
    ('636019882', 'MT SEA DRAGON', '9283741', 'A8TG9', 'tanker', 'Liberia', 274.0, 48.0, FALSE, 'WATCHLIST', 'Shadow fleet transponder shutoff history'),
    ('352002104', 'MT OLYMPIC SPIRIT', '9145678', '3FYQ2', 'tanker', 'Panama', 330.0, 60.0, TRUE, 'OFAC_SDN', 'OFAC Non-proliferation maritime enforcement list (Shadow Fleet STS)'),
    ('419001452', 'MV ARABIAN GULF', '9553210', 'AUVN', 'cargo', 'India', 190.0, 32.0, FALSE, 'CLEAR', NULL),
    ('419000101', 'ICGS SAMARTH', '0000000', 'VWAX', 'military', 'India', 105.0, 14.0, FALSE, 'PATROL', 'Indian Coast Guard Advanced Offshore Patrol Vessel'),
    ('214182991', 'M/V CASPIAN TRADER', '9102456', 'ERX9', 'cargo', 'Moldova', 145.0, 22.0, FALSE, 'SPOOFING_SUSPECT', 'GNSS coordinate jumping advisory'),
    ('224018240', 'CIUDAD DE FELICIDAD', '9211470', 'EAKK', 'passenger', 'Spain', 86.0, 18.0, FALSE, 'CLEAR', 'Passenger catamaran ferry')
ON CONFLICT (mmsi) DO UPDATE SET 
    name = EXCLUDED.name,
    is_sanctioned = EXCLUDED.is_sanctioned,
    watchlist_status = EXCLUDED.watchlist_status;

-- Seed Defense Exclusion Zones
INSERT INTO defense_zones (id, zone_name, zone_type, risk_level, description, geom)
VALUES 
    ('zone-naval-restricted-okha', 'INS Okha Naval Live-Fire Exercise Sector', 'naval_restricted', 'CRITICAL', 'Restricted surface and subsurface live-fire gunnery firing sector', ST_GeomFromText('POLYGON((68.6 22.0, 69.1 22.0, 69.1 22.5, 68.6 22.5, 68.6 22.0))', 4326)),
    ('zone-kutch-chokepoint', 'Gulf of Kutch Deepwater Tanker Fairway', 'chokepoint', 'HIGH', 'High-density crude carrier traffic separation scheme approaching Vadinar SPM', ST_GeomFromText('POLYGON((68.8 22.3, 69.5 22.6, 69.8 22.9, 69.2 22.7, 68.8 22.3))', 4326)),
    ('zone-eez-india-gulf', 'India Western EEZ Boundary Limit', 'eez', 'MONITOR', 'Sovereign Exclusive Economic Zone 200 nautical mile outer baseline', ST_GeomFromText('POLYGON((66.0 20.0, 70.0 20.0, 71.5 23.5, 67.5 23.5, 66.0 20.0))', 4326))
ON CONFLICT (id) DO UPDATE SET 
    zone_name = EXCLUDED.zone_name,
    risk_level = EXCLUDED.risk_level,
    geom = EXCLUDED.geom;

-- Seed Telemetry Coordinates (Point Geometries)
INSERT INTO vessel_tracks (mmsi, timestamp, speed_knots, heading_deg, geom)
VALUES 
    ('636019882', '2026-10-06 00:00:00+00', 13.5, 45.0, ST_SetSRID(ST_MakePoint(66.8, 21.0), 4326)),
    ('636019882', '2026-10-06 06:00:00+00', 12.8, 48.0, ST_SetSRID(ST_MakePoint(67.5, 21.4), 4326)),
    ('636019882', '2026-10-06 12:00:00+00', 11.2, 50.0, ST_SetSRID(ST_MakePoint(68.2, 21.8), 4326)),
    -- Gap period ending at STS coordinates
    ('636019882', '2026-10-07 02:00:00+00', 2.1, 120.0, ST_SetSRID(ST_MakePoint(68.9, 22.2), 4326)),
    ('636019882', '2026-10-08 06:00:00+00', 1.4, 185.0, ST_SetSRID(ST_MakePoint(68.92, 22.18), 4326)),
    ('352002104', '2026-10-08 06:00:00+00', 1.2, 180.0, ST_SetSRID(ST_MakePoint(68.94, 22.17), 4326)),
    ('419001452', '2026-10-08 06:00:00+00', 11.8, 68.0, ST_SetSRID(ST_MakePoint(69.82, 22.75), 4326)),
    ('419000101', '2026-10-08 06:00:00+00', 16.5, 142.0, ST_SetSRID(ST_MakePoint(68.75, 22.35), 4326)),
    ('224018240', '2026-10-08 06:00:00+00', 18.3, 90.0, ST_SetSRID(ST_MakePoint(69.45, 21.65), 4326));

-- Seed SAR Satellite Detections
INSERT INTO sar_detections (id, source_scene_id, modality, timestamp, estimated_length_m, estimated_width_m, confidence, polarization, is_dark_vessel, geom)
VALUES 
    ('sar-det-001', 'S1A_IW_GRDH_1SDV_20261007T011422_054321_068FEA', 'sar_sentinel1', '2026-10-07 01:15:00+00', 280.0, 46.0, 0.942, 'VV', TRUE, ST_SetSRID(ST_MakePoint(68.86, 22.25), 4326)),
    ('sar-det-002', 'S1A_IW_GRDH_1SDV_20261007T011422_054321_068FEA', 'sar_sentinel1', '2026-10-07 01:15:00+00', 335.0, 58.0, 0.915, 'VH', TRUE, ST_SetSRID(ST_MakePoint(68.93, 22.19), 4326));
