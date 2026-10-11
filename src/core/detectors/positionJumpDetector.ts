/**
 * Position Jump & AIS Spoofing Detector Plugin
 * Detects physically impossible vessel velocities between pings (>50 knots for commercial vessels),
 * indicating GPS spoofing or cloned MMSI transmissions.
 */

import type { Finding } from '../../domain/models.ts';
import { haversineDistanceNm } from '../spatialMath.ts';
import type { IDetectorPlugin, DetectorContext } from './detectorInterface.ts';

export class PositionJumpDetector implements IDetectorPlugin {
  readonly id = 'position_jump';
  readonly name = 'AIS Spoofing / Impossible Position Jump';
  readonly version = '1.1.0';
  readonly description = 'Detects implausible speed between consecutive points (>50 kts) indicating spoofed or dual-transmitter MMSI.';
  readonly defaultWeight = 35;

  evaluate(context: DetectorContext): Finding[] {
    const findings: Finding[] = [];
    const maxPlausibleKts = context.configParams?.max_speed_jump_kts || 52.0;

    for (const [vesselId, track] of Object.entries(context.allTracks)) {
      if (!track.points || track.points.length < 2) continue;

      const points = track.points.filter(
        (p) => new Date(p.timestamp).getTime() <= context.currentTimeMs
      );

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const t1 = new Date(p1.timestamp).getTime();
        const t2 = new Date(p2.timestamp).getTime();
        const deltaSec = (t2 - t1) / 1000;

        if (deltaSec > 5 && deltaSec < 3600) {
          const distNm = haversineDistanceNm(p1, p2);
          const computedSpeedKts = distNm / (deltaSec / 3600);

          if (computedSpeedKts > maxPlausibleKts) {
            findings.push({
              rule_id: this.id,
              rule_version: this.version,
              rule_name: this.name,
              category: 'ais_kinematics',
              description: `Vessel ${vesselId} exhibited kinematic jump of ${distNm.toFixed(1)} NM in ${(deltaSec / 60).toFixed(1)} min (${computedSpeedKts.toFixed(0)} kts), indicating GPS spoofing or duplicate MMSI.`,
              score_contribution: this.defaultWeight,
              confidence: 0.92,
              evidence: [
                {
                  id: `ev-jump-${vesselId}-${i}`,
                  title: 'Impossible Velocity Jump',
                  description: `Displacement of ${distNm.toFixed(1)} NM in ${deltaSec} seconds violates physical maritime hull limits.`,
                  timestamp: p2.timestamp,
                  data: {
                    vessel_id: vesselId,
                    computed_speed_kts: Math.round(computedSpeedKts),
                    delta_seconds: deltaSec,
                    dist_nm: Number(distNm.toFixed(1)),
                    p1: [p1.lon, p1.lat],
                    p2: [p2.lon, p2.lat],
                  },
                },
              ],
            });
            break;
          }
        }
      }
    }

    return findings;
  }
}
