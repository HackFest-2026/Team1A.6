/**
 * Detector Registry Initialization
 * Registers all detector plugins into the singleton registry.
 */

import { DetectorRegistry } from './detectorInterface.ts';
import { DarkVesselDetector } from './darkVesselDetector.ts';
import { AisGapDetector } from './aisGapDetector.ts';
import { LoiteringDetector } from './loiteringDetector.ts';
import { RendezvousDetector } from './rendezvousDetector.ts';
import { ZoneIntrusionDetector } from './zoneIntrusionDetector.ts';
import { PositionJumpDetector } from './positionJumpDetector.ts';
import { SanctionsDetector } from './sanctionsDetector.ts';
import { ReportCorrelationDetector } from './reportCorrelationDetector.ts';
import { TrajectoryMlDetector } from './trajectoryMlDetector.ts';

export function initializeDetectorRegistry(): DetectorRegistry {
  const registry = DetectorRegistry.getInstance();

  registry.register(new DarkVesselDetector());
  registry.register(new AisGapDetector());
  registry.register(new LoiteringDetector());
  registry.register(new RendezvousDetector());
  registry.register(new ZoneIntrusionDetector());
  registry.register(new PositionJumpDetector());
  registry.register(new SanctionsDetector());
  registry.register(new ReportCorrelationDetector());
  registry.register(new TrajectoryMlDetector());

  return registry;
}

export { DetectorRegistry };
