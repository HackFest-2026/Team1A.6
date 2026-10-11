/**
 * Loitering Detector Plugin
 * Flags vessels maintaining slow speeds (< 2 knots) outside designated anchorages or ports for extended periods.
 */

import type { Finding } from '../../domain/models.ts';
import { isPointInPolygon } from '../spatialMath.ts';
import type { IDetectorPlugin, DetectorContext } from './detectorInterface.ts';

export class LoiteringDetector implements IDetectorPlugin {
  readonly id = 'loitering';
  readonly name = 'Anomalous Loitering / Drift Pattern';
  readonly version = '1.1.0';
  readonly description = 'Flags vessels drifting or holding station at <2 knots for >4 hours outside permitted anchorages.';
  readonly defaultWeight = 20;

  evaluate(context: DetectorContext): Finding[] {
    const findings: Finding[] = [];
    const minLoiterHours = context.configParams?.min_loiter_hours || 4;
    const maxLoiterSpeedKts = context.configParams?.max_loiter_speed_kts || 2.0;

    // Anchorages and ports where slow speed is normal
    const safeZones = context.allZones.filter(
      (z) => z.zone_type === 'anchorage' || z.zone_type === 'port'
    );

    for (const [vesselId, track] of Object.entries(context.allTracks)) {
      if (!track.points || track.points.length < 3) continue;

      const points = track.points.filter(
        (p) => new Date(p.timestamp).getTime() <= context.currentTimeMs
      );
      if (points.length < 3) continue;

      let consecutiveSlowStartIdx = -1;

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const isSlow = (pt.sog || 0) <= maxLoiterSpeedKts;

        if (isSlow) {
          if (consecutiveSlowStartIdx === -1) {
            consecutiveSlowStartIdx = i;
          } else {
            const startT = new Date(points[consecutiveSlowStartIdx].timestamp).getTime();
            const currT = new Date(pt.timestamp).getTime();
            const durationHours = (currT - startT) / (3600 * 1000);

            if (durationHours >= minLoiterHours) {
              // Check if inside legitimate anchorage
              const inSafeZone = safeZones.some((z) =>
                isPointInPolygon({ lon: pt.lon, lat: pt.lat }, z.coordinates)
              );

              if (!inSafeZone) {
                findings.push({
                  rule_id: this.id,
                  rule_version: this.version,
                  rule_name: this.name,
                  category: 'ais_kinematics',
                  description: `Vessel ${vesselId} loitering at ${pt.sog.toFixed(1)} kts for ${durationHours.toFixed(1)} hours outside designated anchorage.`,
                  score_contribution: this.defaultWeight,
                  confidence: 0.80,
                  evidence: [
                    {
                      id: `ev-loiter-${vesselId}-${i}`,
                      title: 'Offshore Loitering Pattern',
                      description: `Slow drift between ${points[consecutiveSlowStartIdx].timestamp} and ${pt.timestamp} around [${pt.lat.toFixed(4)}°N, ${pt.lon.toFixed(4)}°E].`,
                      timestamp: pt.timestamp,
                      data: {
                        vessel_id: vesselId,
                        duration_hours: Number(durationHours.toFixed(1)),
                        avg_speed_kts: pt.sog,
                        coord: [pt.lon, pt.lat],
                      },
                    },
                  ],
                });
                break; // Alert once per loiter episode
              }
            }
          }
        } else {
          consecutiveSlowStartIdx = -1;
        }
      }
    }

    return findings;
  }
}
