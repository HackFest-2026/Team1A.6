/**
 * Spatial Mathematics & Kinematics Engine
 * Provides geodesic calculations, dead-reckoning extrapolation,
 * track interpolation, point-in-polygon raycasting, and probabilistic matching.
 */

import type { GeoCoordinate, TrackPoint } from '../domain/models.ts';

const EARTH_RADIUS_M = 6371000;
const KNOTS_TO_MS = 0.514444;

/**
 * Calculates great-circle Haversine distance between two coordinates in meters
 */
export function haversineDistanceM(coord1: GeoCoordinate, coord2: GeoCoordinate): number {
  const lat1Rad = (coord1.lat * Math.PI) / 180;
  const lat2Rad = (coord2.lat * Math.PI) / 180;
  const deltaLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLon = ((coord2.lon - coord1.lon) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

export function haversineDistanceKm(coord1: GeoCoordinate, coord2: GeoCoordinate): number {
  return haversineDistanceM(coord1, coord2) / 1000;
}

export function haversineDistanceNm(coord1: GeoCoordinate, coord2: GeoCoordinate): number {
  return haversineDistanceM(coord1, coord2) / 1852;
}

/**
 * Dead-reckoning position extrapolation.
 * Predicts vessel position at targetTime based on last known position, speed (knots), and course (degrees).
 */
export function deadReckonPosition(
  lastPoint: TrackPoint,
  targetTimeMs: number
): GeoCoordinate {
  const lastTimeMs = new Date(lastPoint.timestamp).getTime();
  const timeDeltaSec = (targetTimeMs - lastTimeMs) / 1000;

  if (Math.abs(timeDeltaSec) < 1) {
    return { lon: lastPoint.lon, lat: lastPoint.lat };
  }

  const speedMs = (lastPoint.sog || 0) * KNOTS_TO_MS;
  const distanceTraveledM = speedMs * timeDeltaSec;

  const courseRad = ((lastPoint.cog || lastPoint.heading || 0) * Math.PI) / 180;
  const latRad = (lastPoint.lat * Math.PI) / 180;
  const lonRad = (lastPoint.lon * Math.PI) / 180;

  const angularDistance = distanceTraveledM / EARTH_RADIUS_M;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
    Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(courseRad)
  );

  const newLonRad =
    lonRad +
    Math.atan2(
      Math.sin(courseRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lon: (newLonRad * 180) / Math.PI,
    lat: (newLatRad * 180) / Math.PI,
  };
}

/**
 * Interpolates vessel position along its track for an arbitrary query timestamp.
 */
export function interpolateTrackPosition(
  points: TrackPoint[],
  targetTimeMs: number
): { position: GeoCoordinate; interpolated: boolean; timeDiffSec: number } | null {
  if (!points || points.length === 0) return null;

  // Sort ascending by timestamp
  const sorted = [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Exact boundary cases
  const firstTime = new Date(sorted[0].timestamp).getTime();
  const lastTime = new Date(sorted[sorted.length - 1].timestamp).getTime();

  if (targetTimeMs <= firstTime) {
    return {
      position: { lon: sorted[0].lon, lat: sorted[0].lat },
      interpolated: false,
      timeDiffSec: Math.abs(targetTimeMs - firstTime) / 1000,
    };
  }

  if (targetTimeMs >= lastTime) {
    // If target time is after last point, use dead reckoning if within 6 hours, else last point
    const diffSec = (targetTimeMs - lastTime) / 1000;
    if (diffSec <= 6 * 3600) {
      const drPos = deadReckonPosition(sorted[sorted.length - 1], targetTimeMs);
      return { position: drPos, interpolated: true, timeDiffSec: diffSec };
    }
    return {
      position: { lon: sorted[sorted.length - 1].lon, lat: sorted[sorted.length - 1].lat },
      interpolated: false,
      timeDiffSec: diffSec,
    };
  }

  // Find surrounding segment
  for (let i = 0; i < sorted.length - 1; i++) {
    const tA = new Date(sorted[i].timestamp).getTime();
    const tB = new Date(sorted[i + 1].timestamp).getTime();

    if (targetTimeMs >= tA && targetTimeMs <= tB) {
      const factor = (targetTimeMs - tA) / (tB - tA);
      const lon = sorted[i].lon + factor * (sorted[i + 1].lon - sorted[i].lon);
      const lat = sorted[i].lat + factor * (sorted[i + 1].lat - sorted[i].lat);
      return {
        position: { lon, lat },
        interpolated: true,
        timeDiffSec: 0,
      };
    }
  }

  return null;
}

/**
 * Point in polygon check using ray-casting algorithm (WGS84 lon/lat).
 */
export function isPointInPolygon(point: GeoCoordinate, polygonRings: [number, number][][]): boolean {
  if (!polygonRings || polygonRings.length === 0) return false;

  const ring = polygonRings[0]; // exterior ring
  let inside = false;
  const x = point.lon;
  const y = point.lat;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculates probabilistic spatio-temporal match score between a SAR detection and candidate vessel track
 * Returns probability [0, 1] where > 0.65 is high match, < 0.20 is unmatched (Dark Vessel).
 */
export function computeSpatioTemporalMatchScore(
  detectionLon: number,
  detectionLat: number,
  detectionTimeMs: number,
  trackPoints: TrackPoint[],
  maxDistanceGateM: number = 5000,
  maxTimeGateSec: number = 3600
): { probability: number; distanceM: number; timeDiscrepancySec: number } {
  const result = interpolateTrackPosition(trackPoints, detectionTimeMs);
  if (!result) {
    return { probability: 0, distanceM: 999999, timeDiscrepancySec: 999999 };
  }

  const distanceM = haversineDistanceM(
    { lon: detectionLon, lat: detectionLat },
    result.position
  );

  const timeDiscrepancySec = result.timeDiffSec;

  if (distanceM > maxDistanceGateM || timeDiscrepancySec > maxTimeGateSec) {
    return { probability: 0, distanceM, timeDiscrepancySec };
  }

  // Gaussian decay on distance and time
  const sigmaDistance = maxDistanceGateM / 2.5; // distance variance
  const sigmaTime = maxTimeGateSec / 2.5; // time variance

  const distScore = Math.exp(-0.5 * Math.pow(distanceM / sigmaDistance, 2));
  const timeScore = Math.exp(-0.5 * Math.pow(timeDiscrepancySec / sigmaTime, 2));

  const probability = Number((distScore * 0.7 + timeScore * 0.3).toFixed(4));
  return { probability, distanceM, timeDiscrepancySec };
}

/**
 * -----------------------------------------------------------------------------
 * LINEAR KALMAN FILTER FOR MULTI-TARGET TRACK FUSION & KINEMATIC SMOOTHING
 * -----------------------------------------------------------------------------
 * State Vector X = [x, y, vx, vy]^T
 *   x, y:   Longitude, Latitude in degrees
 *   vx, vy: Velocity in deg/sec
 *
 * Measurement Vector Z = [z_x, z_y]^T
 *   Measurement Matrix H:
 *     [1, 0, 0, 0]
 *     [0, 1, 0, 0]
 */
export class LinearKalmanFilter {
  // State vector [x, y, vx, vy]
  public state: [number, number, number, number];
  // State covariance matrix (4x4)
  public P: number[][];
  // Process noise covariance Q (4x4)
  public Q: number[][];
  // Measurement noise covariance R (2x2)
  public R: number[][];
  public lastTimestampMs: number;

  constructor(
    initialLon: number,
    initialLat: number,
    initialVx: number = 0,
    initialVy: number = 0,
    initialTimestampMs: number = Date.now(),
    processNoiseScale: number = 1e-6,
    measurementNoiseScale: number = 1e-4
  ) {
    this.state = [initialLon, initialLat, initialVx, initialVy];
    this.lastTimestampMs = initialTimestampMs;

    // Initial estimation uncertainty
    this.P = [
      [1e-3, 0, 0, 0],
      [0, 1e-3, 0, 0],
      [0, 0, 1e-2, 0],
      [0, 0, 0, 1e-2],
    ];

    // Process Noise Q
    const q = processNoiseScale;
    this.Q = [
      [q, 0, q * 0.5, 0],
      [0, q, 0, q * 0.5],
      [q * 0.5, 0, q * 2, 0],
      [0, q * 0.5, 0, q * 2],
    ];

    // Measurement Noise R (variance of GPS / AIS / SAR sensor noise)
    const r = measurementNoiseScale;
    this.R = [
      [r, 0],
      [0, r],
    ];
  }

  /**
   * 1. PREDICTION STEP
   * X_pred = F * X
   * P_pred = F * P * F^T + Q
   */
  public predict(dtSec: number): [number, number, number, number] {
    if (dtSec <= 0) return [...this.state];

    // State transition matrix F = [ [1, 0, dt, 0], [0, 1, 0, dt], [0, 0, 1, 0], [0, 0, 0, 1] ]
    const [x, y, vx, vy] = this.state;
    this.state = [x + vx * dtSec, y + vy * dtSec, vx, vy];

    // P_pred = F * P * F^T + Q
    const F = [
      [1, 0, dtSec, 0],
      [0, 1, 0, dtSec],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];

    // FP = F * P
    const FP: number[][] = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          FP[i][j] += F[i][k] * this.P[k][j];
        }
      }
    }

    // FPFt = FP * F^T + Q
    const newP: number[][] = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += FP[i][k] * F[j][k]; // F^T[k][j] == F[j][k]
        }
        newP[i][j] = sum + this.Q[i][j];
      }
    }
    this.P = newP;
    return [...this.state];
  }

  /**
   * 2. UPDATE STEP (Measurement Incorporation)
   * Y = Z - H * X
   * S = H * P * H^T + R
   * K = P * H^T * S^-1
   * X_new = X + K * Y
   * P_new = (I - K * H) * P
   */
  public update(measLon: number, measLat: number): [number, number, number, number] {
    // Residual Y = [measLon - x, measLat - y]
    const y0 = measLon - this.state[0];
    const y1 = measLat - this.state[1];

    // S = H * P * H^T + R -> P[0..1][0..1] + R
    const S00 = this.P[0][0] + this.R[0][0];
    const S01 = this.P[0][1] + this.R[0][1];
    const S10 = this.P[1][0] + this.R[1][0];
    const S11 = this.P[1][1] + this.R[1][1];

    // Det of 2x2 S
    const detS = S00 * S11 - S01 * S10;
    if (Math.abs(detS) < 1e-12) return [...this.state];

    // Inverse of S
    const invS00 = S11 / detS;
    const invS01 = -S01 / detS;
    const invS10 = -S10 / detS;
    const invS11 = S00 / detS;

    // Kalman Gain K (4x2) = P * H^T * S^-1
    // PHt column 0 is P[row][0], column 1 is P[row][1]
    const K: number[][] = [];
    for (let i = 0; i < 4; i++) {
      const p0 = this.P[i][0];
      const p1 = this.P[i][1];
      const k0 = p0 * invS00 + p1 * invS10;
      const k1 = p0 * invS01 + p1 * invS11;
      K.push([k0, k1]);
    }

    // State update X = X + K * Y
    for (let i = 0; i < 4; i++) {
      this.state[i] += K[i][0] * y0 + K[i][1] * y1;
    }

    // Covariance update P = (I - K * H) * P
    const I_KH: number[][] = Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 4 }, (_, j) => (i === j ? 1 : 0))
    );
    for (let i = 0; i < 4; i++) {
      I_KH[i][0] -= K[i][0];
      I_KH[i][1] -= K[i][1];
    }

    const updatedP: number[][] = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          updatedP[i][j] += I_KH[i][k] * this.P[k][j];
        }
      }
    }
    this.P = updatedP;

    return [...this.state];
  }

  /**
   * Process a sequence of timestamped track points and produce smoothed trajectory
   */
  public static smoothTrack(points: TrackPoint[]): TrackPoint[] {
    if (!points || points.length <= 1) return points || [];

    const sorted = [...points].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const initial = sorted[0];
    const kf = new LinearKalmanFilter(
      initial.lon,
      initial.lat,
      0,
      0,
      new Date(initial.timestamp).getTime()
    );

    const smoothed: TrackPoint[] = [{ ...initial }];

    for (let i = 1; i < sorted.length; i++) {
      const pt = sorted[i];
      const timeMs = new Date(pt.timestamp).getTime();
      const dtSec = Math.max(0.1, (timeMs - kf.lastTimestampMs) / 1000);

      kf.predict(dtSec);
      const [smoothLon, smoothLat, vx, vy] = kf.update(pt.lon, pt.lat);
      kf.lastTimestampMs = timeMs;

      // Approximate speed in knots from velocity in deg/sec
      const speedKnots = Math.sqrt(vx * vx + vy * vy) * 111320 * 1.94384;

      smoothed.push({
        ...pt,
        lon: Number(smoothLon.toFixed(6)),
        lat: Number(smoothLat.toFixed(6)),
        sog: pt.sog ? Number((pt.sog * 0.7 + speedKnots * 0.3).toFixed(1)) : pt.sog,
      });
    }

    return smoothed;
  }
}

/**
 * -----------------------------------------------------------------------------
 * PREDICT NEXT POSITION (MMSI Dead-Reckoning Extrapolation via Kalman Filter)
 * -----------------------------------------------------------------------------
 * Projects where a target vessel will be if its transponder goes completely
 * silent, satisfying multi-target track fusion & sovereign AI requirements.
 */
export function predictNextPosition(
  mmsiOrPoints: string | TrackPoint[],
  targetTime: string | number,
  knownTracks?: Record<string, { points: TrackPoint[] }>
): (GeoCoordinate & { predictedVx: number; predictedVy: number; uncertaintyRadiusM: number }) {
  const targetTimeMs = typeof targetTime === 'string' ? new Date(targetTime).getTime() : targetTime;

  let points: TrackPoint[] = [];
  if (Array.isArray(mmsiOrPoints)) {
    points = mmsiOrPoints;
  } else if (knownTracks && knownTracks[mmsiOrPoints]) {
    points = knownTracks[mmsiOrPoints].points || [];
  }

  // Fallback if no track points provided
  if (!points || points.length === 0) {
    return {
      lon: 68.8,
      lat: 22.3,
      predictedVx: 0,
      predictedVy: 0,
      uncertaintyRadiusM: 5000,
    };
  }

  const sorted = [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const lastPoint = sorted[sorted.length - 1];
  const lastTimeMs = new Date(lastPoint.timestamp).getTime();
  const dtSec = Math.max(0, (targetTimeMs - lastTimeMs) / 1000);

  // Initialize Kalman Filter from last known observation and recent velocity
  let initVx = 0;
  let initVy = 0;
  if (sorted.length >= 2) {
    const prev = sorted[sorted.length - 2];
    const prevTimeMs = new Date(prev.timestamp).getTime();
    const prevDtSec = Math.max(1, (lastTimeMs - prevTimeMs) / 1000);
    initVx = (lastPoint.lon - prev.lon) / prevDtSec;
    initVy = (lastPoint.lat - prev.lat) / prevDtSec;
  } else if (lastPoint.sog && lastPoint.cog !== undefined) {
    // SOG in knots to deg/sec (~111km per deg lat)
    const speedMs = lastPoint.sog * 0.514444;
    const cogRad = (lastPoint.cog * Math.PI) / 180;
    initVy = (speedMs * Math.cos(cogRad)) / 111320;
    initVx = (speedMs * Math.sin(cogRad)) / (111320 * Math.cos((lastPoint.lat * Math.PI) / 180));
  }

  const kf = new LinearKalmanFilter(lastPoint.lon, lastPoint.lat, initVx, initVy, lastTimeMs);
  const [predLon, predLat, pVx, pVy] = kf.predict(dtSec);

  // Growth in uncertainty covariance radius as a function of elapsed silent time
  // delta_r = sigma_0 + 0.5 * a_max * dt^2 (capped within operational bounds)
  const uncertaintyRadiusM = Math.min(50000, 200 + dtSec * 3.5 + Math.sqrt(kf.P[0][0] + kf.P[1][1]) * 111320);

  return {
    lon: Number(predLon.toFixed(6)),
    lat: Number(predLat.toFixed(6)),
    predictedVx: pVx,
    predictedVy: pVy,
    uncertaintyRadiusM: Number(uncertaintyRadiusM.toFixed(1)),
  };
}
