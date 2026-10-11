/**
 * Hexagonal Maritime Fusion Engine
 * Coordinates Ingestion -> Normalization -> Enrichment -> Fusion -> Threat Detection -> Scored Persistence.
 */

import type {
  MaritimeOperationalState,
  Alert,
  ReviewDecision,
  AlertStatus,
  GroundTruthBenchmark,
  Detection,
} from '../domain/models.ts';
import {
  ZONES_FIXTURE,
  REPORTS_FIXTURE,
  VESSELS_FIXTURE,
  TRACKS_FIXTURE,
  SAR_DETECTIONS_FIXTURE,
} from '../fixtures/maritimeData.ts';
import { initializeDetectorRegistry, DetectorRegistry } from './detectors/index.ts';
import { calculateCompositeAlert } from './scorer.ts';
import { evaluateDarkVesselDetection } from './evaluator.ts';
import { interpolateTrackPosition, LinearKalmanFilter, predictNextPosition } from './spatialMath.ts';

export class FusionEngine {
  private static instance: FusionEngine;
  private registry: DetectorRegistry;
  private reviewHistory: Map<string, ReviewDecision[]> = new Map();
  private alertStatuses: Map<string, AlertStatus> = new Map();
  private alertNotes: Map<string, string[]> = new Map();

  // Dynamic user-added detections and imported CSV tracks
  private customDetections: Detection[] = [];
  private importedVessels: Map<string, any> = new Map();
  private importedTracks: Record<string, any> = {};

  // Replay State
  private startTimeMs: number = new Date('2026-10-06T00:00:00Z').getTime();
  private endTimeMs: number = new Date('2026-10-08T06:00:00Z').getTime();
  private currentTimeMs: number = new Date('2026-10-08T06:00:00Z').getTime();
  private isReplayLive: boolean = false;
  private replaySpeed: number = 1.0;

  private constructor() {
    this.registry = initializeDetectorRegistry();
  }

  public static getInstance(): FusionEngine {
    if (!FusionEngine.instance) {
      FusionEngine.instance = new FusionEngine();
    }
    return FusionEngine.instance;
  }

  public getSimulationTime(): number {
    return this.currentTimeMs;
  }

  public setSimulationTime(timeMs: number): void {
    this.currentTimeMs = Math.max(this.startTimeMs, Math.min(this.endTimeMs, timeMs));
  }

  public getReplayBounds(): { start: number; end: number; current: number; speed: number; isLive: boolean } {
    return {
      start: this.startTimeMs,
      end: this.endTimeMs,
      current: this.currentTimeMs,
      speed: this.replaySpeed,
      isLive: this.isReplayLive,
    };
  }

  public setReplaySpeed(speed: number): void {
    this.replaySpeed = speed;
  }

  public setReplayLive(isLive: boolean): void {
    this.isReplayLive = isLive;
    if (isLive) {
      this.currentTimeMs = this.endTimeMs;
    }
  }

  public recordReviewDecision(
    alertId: string,
    action: AlertStatus,
    analyst: string = 'Duty Officer (Naval Intelligence)',
    note: string = ''
  ): ReviewDecision {
    const decision: ReviewDecision = {
      alert_id: alertId,
      analyst,
      action,
      note,
      timestamp: new Date().toISOString(),
    };

    if (!this.reviewHistory.has(alertId)) {
      this.reviewHistory.set(alertId, []);
    }
    this.reviewHistory.get(alertId)!.push(decision);
    this.alertStatuses.set(alertId, action);

    if (note) {
      if (!this.alertNotes.has(alertId)) {
        this.alertNotes.set(alertId, []);
      }
      this.alertNotes.get(alertId)!.push(note);
    }

    return decision;
  }

  public addCustomDetection(detection: any): any {
    const newDet = {
      id: detection.id || `det-opt-${Date.now().toString().slice(-4)}`,
      modality: (detection.sensor_type === 'sar' ? 'sar' : 'optical') as any,
      timestamp: detection.timestamp || new Date(this.currentTimeMs).toISOString(),
      lat: Number(detection.lat) || 22.3,
      lon: Number(detection.lon) || 68.8,
      source_scene_id: detection.source_scene_id || 'UAV-OPT-RECON-7',
      sensor_type: detection.sensor_type || 'optical',
      confidence: Number(detection.confidence) || 0.92,
      estimated_length_m: Number(detection.estimated_length_m) || 110,
      is_dark_vessel: typeof detection.is_dark_vessel === 'boolean' ? detection.is_dark_vessel : true,
      detection_source: detection.detection_source || 'Tactical Drone UAV-7 (Optical FLIR)',
      label: detection.label || 'Vessel Contact',
      bbox: detection.bbox,
    };
    this.customDetections.push(newDet);
    return newDet;
  }

  public importVesselPoints(
    points: Array<{
      vesselId: string;
      vesselName?: string;
      lat: number;
      lon: number;
      timestamp: string;
      sog?: number;
      cog?: number;
      flag?: string;
      type?: string;
    }>
  ): { importedCount: number; vesselCount: number } {
    if (!points || !points.length) return { importedCount: 0, vesselCount: 0 };

    for (const p of points) {
      const vId = p.vesselId.trim() || 'vessel-import';
      if (!this.importedTracks[vId]) {
        this.importedTracks[vId] = {
          vessel_id: vId,
          points: [],
          start_time: p.timestamp,
          end_time: p.timestamp,
        };
      }

      this.importedTracks[vId].points.push({
        lat: p.lat,
        lon: p.lon,
        timestamp: p.timestamp,
        sog: p.sog ?? 12.0,
        cog: p.cog ?? 180.0,
        heading: p.cog ?? 180.0,
        nav_status: 'underway_engine',
      });

      if (!this.importedVessels.has(vId)) {
        this.importedVessels.set(vId, {
          id: vId,
          name: p.vesselName || `IMPORT-${vId.toUpperCase()}`,
          mmsi: vId.replace(/\D/g, '') || '419999999',
          imo: 'IMO9999999',
          flag_country: p.flag || 'Panama',
          type: (p.type as any) || 'cargo',
          length_m: 145,
          beam_m: 22,
          is_sanctioned: false,
          risk_category: 'standard',
          data_source: 'CSV Import (User Batch)',
          last_known_position: { lat: p.lat, lon: p.lon },
        });
      } else {
        const existing = this.importedVessels.get(vId);
        existing.last_known_position = { lat: p.lat, lon: p.lon };
      }
    }

    return {
      importedCount: points.length,
      vesselCount: this.importedVessels.size,
    };
  }

  public computeState(): MaritimeOperationalState {
    const timeMs = this.currentTimeMs;

    // Combine static fixtures with dynamically imported vessels
    const allBaseVessels = [...VESSELS_FIXTURE, ...Array.from(this.importedVessels.values())];
    const allTracksDict = { ...TRACKS_FIXTURE, ...this.importedTracks };

    // 1. Calculate vessel positions at current timestamp using Kalman-smoothed tracks
    const dynamicVessels = allBaseVessels.map((vessel) => {
      const track = allTracksDict[vessel.id];
      if (track && track.points && track.points.length > 0) {
        // Apply Linear Kalman Filter track smoothing to eliminate sensor jitter
        const smoothedPoints = LinearKalmanFilter.smoothTrack(track.points);
        const interp = interpolateTrackPosition(smoothedPoints, timeMs);
        if (interp) {
          const sorted = [...smoothedPoints].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          const nearest = sorted.reduce((prev: any, curr: any) => {
            const prevDiff = Math.abs(new Date(prev.timestamp).getTime() - timeMs);
            const currDiff = Math.abs(new Date(curr.timestamp).getTime() - timeMs);
            return currDiff < prevDiff ? curr : prev;
          });

          return {
            ...vessel,
            last_known_point: {
              ...interp.position,
              timestamp: new Date(timeMs).toISOString(),
              sog: nearest.sog || 0,
              cog: nearest.cog || 0,
              heading: nearest.heading || nearest.cog || 0,
              nav_status: nearest.nav_status || 'underway_engine',
            },
          };
        }
      }
      return vessel;
    });

    // 2. Filter detections up to current time (including custom-uploaded ones)
    const combinedDetections = [...SAR_DETECTIONS_FIXTURE, ...this.customDetections];
    const activeDetections = combinedDetections.filter(
      (d) => new Date(d.timestamp).getTime() <= timeMs
    );

    // 3. Evaluate all registered detectors
    const context = {
      currentTimeMs: timeMs,
      allVessels: dynamicVessels,
      allTracks: allTracksDict,
      allDetections: activeDetections,
      allZones: ZONES_FIXTURE,
      allReports: REPORTS_FIXTURE,
      configParams: {
        sar_gate_dist_m: 5000,
        sar_gate_time_sec: 3600,
        min_gap_sec: 3 * 3600,
        min_loiter_hours: 4,
        rendezvous_dist_m: 500,
      },
    };

    const allFindings = this.registry.runAll(context);

    // 4. Group findings by vessel / contact target and synthesize alerts
    const findingsByTarget: Map<string, typeof allFindings> = new Map();
    for (const f of allFindings) {
      // Extract target id from evidence or description
      const targetId =
        f.evidence?.[0]?.data?.vessel_id ||
        f.evidence?.[0]?.data?.primary_vessel_id ||
        f.evidence?.[0]?.data?.detection_id ||
        'contact-unknown';

      if (!findingsByTarget.has(targetId)) {
        findingsByTarget.set(targetId, []);
      }
      findingsByTarget.get(targetId)!.push(f);
    }

    const alerts: Alert[] = [];
    for (const [targetId, findings] of findingsByTarget.entries()) {
      const vessel = dynamicVessels.find((v) => v.id === targetId);
      const detection = activeDetections.find((d) => d.id === targetId);

      const targetName = vessel
        ? vessel.name
        : detection
        ? `SAR Contact ${detection.id}`
        : `Target ${targetId}`;

      const mmsi = vessel ? vessel.mmsi : 'UNREGISTERED';
      const loc = vessel?.last_known_point
        ? { lon: vessel.last_known_point.lon, lat: vessel.last_known_point.lat }
        : detection
        ? { lon: detection.lon, lat: detection.lat }
        : { lon: 68.9, lat: 22.2 };

      const existingStatus = this.alertStatuses.get(targetId);
      const existingNotes = this.alertNotes.get(targetId);
      const existingHistory = this.reviewHistory.get(targetId);

      const alert = calculateCompositeAlert(
        targetId,
        targetName,
        mmsi,
        loc,
        new Date(timeMs).toISOString(),
        findings,
        existingStatus
          ? {
              id: `alert-${targetId}`,
              status: existingStatus,
              notes: existingNotes || [],
              review_history: existingHistory || [],
            } as any
          : undefined
      );

      alerts.push(alert);
    }

    // Sort alerts by risk score descending
    alerts.sort((a, b) => b.score - a.score);

    const darkCount = activeDetections.filter((d) => d.is_dark_vessel).length;
    const activeThreatCount = alerts.filter(
      (a) => a.threat_level === 'CRITICAL' || a.threat_level === 'HIGH'
    ).length;

    return {
      timestamp: new Date(timeMs).toISOString(),
      vessels: dynamicVessels,
      tracks: TRACKS_FIXTURE,
      detections: activeDetections,
      zones: ZONES_FIXTURE,
      reports: REPORTS_FIXTURE,
      alerts,
      kpis: {
        active_threats: activeThreatCount,
        dark_vessels_detected: darkCount,
        ais_tracks_active: dynamicVessels.length,
        sar_coverage_health_pct: 98.4,
        data_freshness_seconds: 12,
      },
    };
  }

  public runBenchmarkEvaluation(): GroundTruthBenchmark {
    return evaluateDarkVesselDetection(SAR_DETECTIONS_FIXTURE);
  }

  /**
   * Predict next position for dead-reckoning extrapolation when target goes silent
   */
  public predictNextPosition(
    mmsiOrVesselId: string,
    targetTimeMs: number
  ): { lon: number; lat: number; predictedVx: number; predictedVy: number; uncertaintyRadiusM: number } {
    const allTracksDict = { ...TRACKS_FIXTURE, ...this.importedTracks };
    return predictNextPosition(mmsiOrVesselId, targetTimeMs, allTracksDict);
  }
}
