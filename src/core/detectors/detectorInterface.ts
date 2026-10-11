/**
 * Detector Strategy Interface and Registry
 * Modular plugin system for maritime anomaly detection.
 */

import type {
  Vessel,
  Track,
  Detection,
  Zone,
  IntelligenceReport,
  Finding,
} from '../../domain/models.ts';

export interface DetectorContext {
  currentTimeMs: number;
  allVessels: Vessel[];
  allTracks: Record<string, Track>;
  allDetections: Detection[];
  allZones: Zone[];
  allReports: IntelligenceReport[];
  configParams?: Record<string, any>;
}

export interface IDetectorPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly defaultWeight: number; // base score contribution

  evaluate(context: DetectorContext): Finding[];
}

export class DetectorRegistry {
  private static instance: DetectorRegistry;
  private detectors: Map<string, IDetectorPlugin> = new Map();

  private constructor() {}

  public static getInstance(): DetectorRegistry {
    if (!DetectorRegistry.instance) {
      DetectorRegistry.instance = new DetectorRegistry();
    }
    return DetectorRegistry.instance;
  }

  public register(detector: IDetectorPlugin): void {
    this.detectors.set(detector.id, detector);
  }

  public get(id: string): IDetectorPlugin | undefined {
    return this.detectors.get(id);
  }

  public getAll(): IDetectorPlugin[] {
    return Array.from(this.detectors.values());
  }

  public runAll(context: DetectorContext): Finding[] {
    const findings: Finding[] = [];
    for (const detector of this.detectors.values()) {
      try {
        const result = detector.evaluate(context);
        findings.push(...result);
      } catch (err) {
        console.error(`Error executing detector ${detector.id}:`, err);
      }
    }
    return findings;
  }
}
