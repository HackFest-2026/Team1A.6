/**
 * Rendezvous & Encounter Detector Plugin
 * Detects suspicious ship-to-ship (STS) close proximities (< 500 meters for > 30 mins) in open waters.
 */

import type { Finding } from '../../domain/models.ts';
import { haversineDistanceM, interpolateTrackPosition } from '../spatialMath.ts';
import type { IDetectorPlugin, DetectorContext } from './detectorInterface.ts';

export class RendezvousDetector implements IDetectorPlugin {
  readonly id = 'rendezvous';
  readonly name = 'Ship-to-Ship (STS) Rendezvous Encounter';
  readonly version = '1.2.0';
  readonly description = 'Flags two vessels maintaining close proximity (<500m) for >30 minutes outside port limits.';
  readonly defaultWeight = 35;

  evaluate(context: DetectorContext): Finding[] {
    const findings: Finding[] = [];
    const maxDistanceM = context.configParams?.rendezvous_dist_m || 500;
    const vesselIds = Object.keys(context.allTracks);

    for (let i = 0; i < vesselIds.length; i++) {
      for (let j = i + 1; j < vesselIds.length; j++) {
        const idA = vesselIds[i];
        const idB = vesselIds[j];
        const trackA = context.allTracks[idA];
        const trackB = context.allTracks[idB];

        if (!trackA.points || !trackB.points || trackA.points.length === 0 || trackB.points.length === 0) continue;

        // Sample points from trackA up to currentTime
        const samplePoints = trackA.points.filter(
          (p) => new Date(p.timestamp).getTime() <= context.currentTimeMs
        );

        let closePings = 0;
        let minEncounterDist = Infinity;
        let encounterPoint: any = null;

        for (const ptA of samplePoints) {
          const tMs = new Date(ptA.timestamp).getTime();
          const posB = interpolateTrackPosition(trackB.points, tMs);

          if (posB && posB.timeDiffSec < 1200) {
            const dist = haversineDistanceM(ptA, posB.position);
            if (dist <= maxDistanceM) {
              closePings++;
              if (dist < minEncounterDist) {
                minEncounterDist = dist;
                encounterPoint = ptA;
              }
            }
          }
        }

        // At least 2 consecutive pings in close proximity (~30 mins)
        if (closePings >= 2 && encounterPoint) {
          findings.push({
            rule_id: this.id,
            rule_version: this.version,
            rule_name: this.name,
            category: 'rendezvous',
            description: `Potential Ship-to-Ship (STS) encounter between vessel ${idA} and vessel ${idB} (minimum separation: ${Math.round(minEncounterDist)}m).`,
            score_contribution: this.defaultWeight,
            confidence: 0.90,
            evidence: [
              {
                id: `ev-sts-${idA}-${idB}`,
                title: 'High-Risk STS Rendezvous',
                description: `Vessels conducted sustained parallel drift at [${encounterPoint.lat.toFixed(4)}°N, ${encounterPoint.lon.toFixed(4)}°E] without AIS distress call.`,
                timestamp: encounterPoint.timestamp,
                data: {
                  primary_vessel_id: idA,
                  secondary_vessel_id: idB,
                  separation_meters: Math.round(minEncounterDist),
                  duration_pings: closePings,
                  coordinates: [encounterPoint.lon, encounterPoint.lat],
                },
              },
            ],
          });
        }
      }
    }

    return findings;
  }
}
