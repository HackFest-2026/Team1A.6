/**
 * Domain Models for Maritime Threat Detection & Fusion
 * Canonical entities - strictly decoupled from database, HTTP or vendor SDKs.
 * Coordinates: WGS84 [longitude, latitude]
 * Time: ISO-8601 UTC strings
 * Units: Speeds in knots, distances in meters / kilometers, heading in degrees [0, 360).
 */

export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AlertStatus = 'NEW' | 'CONFIRMED' | 'DISMISSED' | 'ESCALATED';

export type OperatingDomain = 'NAVY' | 'ARMY' | 'UNIFIED';

export type GeoreferenceStatus = 'GEOREFERENCED' | 'UNREFERENCED' | 'AMBIGUOUS';

export type VisDroneCategory =
  | 'pedestrian'
  | 'people'
  | 'bicycle'
  | 'car'
  | 'van'
  | 'truck'
  | 'tricycle'
  | 'awning-tricycle'
  | 'bus'
  | 'motor'
  | 'unknown';

export type DetectionModality =
  | 'sar_sentinel1'
  | 'optical_sentinel2'
  | 'rf_emitter'
  | 'coastal_radar'
  | 'uav_optical'
  | 'uav_video'
  | 'UAV_IMAGE'
  | 'UAV_VIDEO';

export type ZoneType = 'eez' | 'naval_restricted' | 'anchorage' | 'chokepoint' | 'port' | 'piracy_hra';

export interface CameraMetadata {
  cameraLat?: number;
  cameraLon?: number;
  altitudeM?: number;
  pitchDeg?: number;
  headingDeg?: number;
  fovDeg?: number;
  focalLengthMm?: number;
  pixelWidth?: number;
  pixelHeight?: number;
  transformMatrix?: number[][];
  georeferencingSource?: string;
  crs?: string;
}

export interface UavDetection {
  id: string;
  assetId: string;
  frameIndex?: number;
  frameTimestampMs?: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  classId: number;
  className: VisDroneCategory;
  confidence: number;
  modelName: string;
  checkpointId: string;
  inferenceTimestamp: string;
  inferenceLatencyMs: number;
  trackerId?: number | null;
  georeferenceStatus: GeoreferenceStatus;
  geoCoordinate?: GeoCoordinate;
  cameraMetadata?: CameraMetadata;
}

export type CheckStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN';

export interface SystemVerificationCheck {
  id: string;
  name: string;
  category: 'CORE_BACKEND' | 'DATABASE' | 'SAR_MODEL' | 'GFW_API' | 'VISDRONE_MODEL' | 'FUSION_ENGINE' | 'SECURITY';
  status: CheckStatus;
  timestamp: string;
  durationMs: number;
  version?: string;
  details: string;
  sanitizedOutput?: string;
  acceptanceCriteria: string;
  testType: 'REAL_EXECUTION' | 'MOCKED_INTEGRATION' | 'UNIT_TEST';
}

export interface GeoCoordinate {
  lon: number; // WGS-84 longitude [-180, 180]
  lat: number; // WGS-84 latitude [-90, 90]
}

export interface TrackPoint extends GeoCoordinate {
  timestamp: string; // ISO-8601 UTC
  sog: number; // Speed over ground in knots
  cog: number; // Course over ground in degrees
  heading?: number; // True heading in degrees
  nav_status?: string; // 'underway_engine', 'at_anchor', 'moored', 'restricted_manoeuvrability'
  draught?: number; // meters
}

export interface Vessel {
  id: string; // Internal unique ID or MMSI
  mmsi: string;
  imo?: string;
  name: string;
  callsign?: string;
  vessel_type: string; // 'tanker', 'cargo', 'fishing', 'tug', 'military', 'unknown'
  flag_country: string;
  length_m?: number;
  width_m?: number;
  is_sanctioned: boolean;
  sanction_details?: string;
  last_known_point?: TrackPoint;
}

export interface Track {
  vessel_id: string;
  mmsi: string;
  points: TrackPoint[];
  start_time: string;
  end_time: string;
  total_distance_km: number;
}

export interface Detection extends GeoCoordinate {
  id: string;
  modality: DetectionModality;
  timestamp: string; // ISO-8601 UTC
  estimated_length_m?: number;
  estimated_width_m?: number;
  confidence: number; // 0.0 to 1.0
  source_scene_id: string; // e.g. Sentinel-1 GRD acquisition ID
  polarization?: 'VV' | 'VH' | 'HH' | 'HV';
  matched_vessel_id?: string; // Set when correlated to an AIS track
  match_probability?: number; // Probabilistic correlation score [0, 1]
  is_dark_vessel?: boolean; // true if high-confidence SAR detection with no AIS match
  xview3?: {
    chip_id: string;
    chip_row: number;
    chip_col: number;
    bbox: [number, number, number, number]; // [top, left, bottom, right] (0..800 pixels)
    is_vessel_prob: number;
    is_fishing_prob: number;
    predicted_length_m: number;
    ground_truth_length_m?: number;
    distance_from_shore_km: number;
    sar_backscatter_db: number;
    channels: string[];
    model_version: string;
  };
}

export interface XView3EvaluationMetric {
  scene_id: string;
  total_predictions: number;
  total_ground_truth: number;
  f1_detection: number;
  f1_vessel: number;
  f1_fishing: number;
  length_mape: number;
  aggregate_score: number;
  distance_tolerance_m: number;
  costly_dist_applied: boolean;
  drop_low_detect_applied: boolean;
}

export interface Zone {
  id: string;
  name: string;
  zone_type: ZoneType;
  country: string;
  coordinates: [number, number][][]; // Polygon rings [[lon, lat], ...]
  description?: string;
  color?: string;
}

export interface IntelligenceReport {
  id: string;
  source: 'gdelt' | 'navarea_warning' | 'opensanctions' | 'maritime_security_center';
  title: string;
  summary: string;
  timestamp: string;
  url?: string;
  entities: {
    vessels: string[];
    mmsis: string[];
    imos: string[];
    locations: string[];
  };
  threat_level: ThreatLevel;
  related_zone_id?: string;
}

export interface EvidenceRecord {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface Finding {
  rule_id: string;
  rule_version: string;
  rule_name: string;
  category: 'radar_correlation' | 'ais_kinematics' | 'geofencing' | 'rendezvous' | 'intelligence';
  description: string;
  score_contribution: number; // 0 to 100
  confidence: number; // 0.0 to 1.0
  evidence: EvidenceRecord[];
}

export interface ReviewDecision {
  alert_id: string;
  analyst: string;
  action: AlertStatus;
  note: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  vessel_id: string;
  vessel_name: string;
  mmsi: string;
  timestamp: string;
  location: GeoCoordinate;
  threat_level: ThreatLevel;
  score: number; // 0 to 100 explainable score
  primary_rule: string;
  summary: string;
  findings: Finding[];
  status: AlertStatus;
  notes: string[];
  review_history: ReviewDecision[];
  data_freshness_sec: number;
  confidence_rating: 'CONFIRMED' | 'HIGH_CONFIDENCE' | 'MODERATE_CONFIDENCE' | 'LOW_CONFIDENCE';
}

export interface MaritimeOperationalState {
  timestamp: string;
  vessels: Vessel[];
  tracks: Record<string, Track>;
  detections: Detection[];
  zones: Zone[];
  reports: IntelligenceReport[];
  alerts: Alert[];
  kpis: {
    active_threats: number;
    dark_vessels_detected: number;
    ais_tracks_active: number;
    sar_coverage_health_pct: number;
    data_freshness_seconds: number;
  };
}

export interface GroundTruthBenchmark {
  total_sar_detections: number;
  true_dark_vessels: number;
  true_cooperative_vessels: number;
  detected_dark_vessels: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  true_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
  accuracy: number;
}

export type ScenarioId =
  | 'sar_detection'
  | 'uav_optical'
  | 'uav_video'
  | 'ais_csv'
  | 'gfw_live'
  | 'multimodal_fusion';

export type ScenarioStatus = 'READY' | 'CONFIGURED' | 'BLOCKED' | 'NOT_CONFIGURED';

export interface ScenarioCardConfig {
  id: ScenarioId;
  code: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  name: string;
  purpose: string;
  acceptedFileTypes: string[];
  modelDependency: string;
  status: ScenarioStatus;
  statusDescription: string;
}

export interface ScenarioUploadFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  path?: string;
  previewUrl?: string;
  status: 'UPLOADED' | 'VALIDATED' | 'REJECTED';
  validationMessage?: string;
}

export interface ScenarioJob {
  id: string;
  scenarioId: ScenarioId;
  createdAt: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progressPct: number;
  files: ScenarioUploadFile[];
  config: Record<string, any>;
  result?: any;
  error?: string | null;
  metrics: {
    uploadTimeMs?: number;
    preprocessingTimeMs?: number;
    inferenceTimeMs?: number;
    totalTimeMs?: number;
    throughputFps?: number;
    detectionCount?: number;
    classCounts?: Record<string, number>;
    telemetry?: string;
    groundTruthEvaluation?: string;
  };
}

export interface AisRowError {
  rowNumber: number;
  field: string;
  message: string;
  rawSample?: string;
}

export interface AisValidationSummary {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  correctedRows: number;
  errors: AisRowError[];
  previewRows: Array<Record<string, any>>;
  detectedAnomalies?: Array<{
    mmsi: string;
    vesselName: string;
    rule: string;
    threatLevel: ThreatLevel;
    confidence: number;
    details: string;
  }>;
}

export interface SarAisMatchItem {
  detectionId: string;
  lat: number;
  lon: number;
  confidence: number;
  status: 'AIS Matched' | 'Unmatched SAR Candidate' | 'Ambiguous Match';
  matchedMmsi?: string;
  matchedVesselName?: string;
  distanceMeters?: number;
  timeDiffMinutes?: number;
  explanation: string;
}

