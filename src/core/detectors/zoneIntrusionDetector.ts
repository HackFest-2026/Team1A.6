/**
 * Zone Intrusion Detector Plugin
 * Flags vessels entering prohibited military firing ranges, naval defense zones, or marine sanctuaries.
 */

import type { Finding } from '../../domain/models.ts';
import { isPointInPolygon } from '../spatialMath.ts';
import type { IDetectorPlugin, DetectorContext } from './detectorInterface.ts';

export class ZoneIntrusionDetector implements IDetectorPlugin {
  readonly id = 'zone_intrusion';
  readonly name = 'Restricted Defense Zone Intrusion';
  readonly version = '1.3.0';
  readonly description = 'Detects unauthorized penetration into naval exercise boundaries, defense installations, or exclusion zones.';
  readonly defaultWeight = 30;

  evaluate(context: DetectorContext): Finding[] {
    const findings: Finding[] = [];
    const restrictedZones = context.allZones.filter(
      (z) => z.zone_type === 'naval_restricted' || z.zone_type === 'chokepoint'
    );

    for (const [vesselId, track] of Object.entries(context.allTracks)) {
      if (!track.points) continue;

      const activePoints = track.points.filter(
        (p) => new Date(p.timestamp).getTime() <= context.currentTimeMs
      );

      for (const pt of activePoints) {
        for (const zone of restrictedZones) {
          const isInside = isPointInPolygon({ lon: pt.lon, lat: pt.lat }, zone.coordinates);

          if (isInside) {
            findings.push({
              rule_id: this.id,
              rule_version: this.version,
              rule_name: this.name,
              category: 'geofencing',
              description: `Vessel ${vesselId} breached protected area: ${zone.name} (${zone.country}).`,
              score_contribution: this.defaultWeight,
              confidence: 0.95,
              evidence: [
                {
                  id: `ev-zone-${vesselId}-${zone.id}`,
                  title: 'Geofence Breach Event',
                  description: `Trajectory intersected polygon of ${zone.name} at ${pt.timestamp} [${pt.lat.toFixed(4)}°N, ${pt.lon.toFixed(4)}°E].`,
                  timestamp: pt.timestamp,
                  data: {
                    vessel_id: vesselId,
                    zone_id: zone.id,
                    zone_name: zone.name,
                    zone_type: zone.zone_type,
                    point: [pt.lon, pt.lat],
                    speed_kts: pt.sog,
                  },
                },
              ],
            });
            break; // One intrusion alert per zone
          }
        }
      }
    }

    return findings;
  }
}
