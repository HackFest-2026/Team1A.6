/**
 * AIS Gap Detector Plugin
 * Detects suspicious discontinuation of AIS transmissions while vessel is underway in high-risk waters.
 */

import type { Finding } from '../../domain/models.ts';
import { haversineDistanceNm } from '../spatialMath.ts';
import type { IDetectorPlugin, DetectorContext } from './detectorInterface.ts';

export class AisGapDetector implements IDetectorPlugin {
  readonly id = 'ais_gap';
  readonly name = 'AIS Transmission Gap / Transponder Shut-Off';
  readonly version = '1.2.0';
  readonly description = 'Flags vessels that cease transmitting AIS signals for >3 hours while underway in territorial waters or EEZ.';
  readonly defaultWeight = 25;

  evaluate(context: DetectorContext): Finding[] {
    const findings: Finding[] = [];
    const minGapSec = context.configParams?.min_gap_sec || 3 * 3600; // 3 hours

    for (const [vesselId, track] of Object.entries(context.allTracks)) {
      if (!track.points || track.points.length < 2) continue;

      const points = track.points.filter(
        (p) => new Date(p.timestamp).getTime() <= context.currentTimeMs
      );
      if (points.length < 2) continue;

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        const t1 = new Date(p1.timestamp).getTime();
        const t2 = new Date(p2.timestamp).getTime();
        const gapSec = (t2 - t1) / 1000;

        if (gapSec >= minGapSec) {
          const distNm = haversineDistanceNm(p1, p2);
          const impliedSpeedKts = distNm / (gapSec / 3600);

          findings.push({
            rule_id: this.id,
            rule_version: this.version,
            rule_name: this.name,
            category: 'ais_kinematics',
            description: `Vessel ${vesselId} had unbroadcasted AIS interval of ${(gapSec / 3600).toFixed(1)} hours covering ${distNm.toFixed(1)} NM (implied speed ${impliedSpeedKts.toFixed(1)} kts).`,
            score_contribution: this.defaultWeight,
            confidence: 0.85,
            evidence: [
              {
                id: `ev-gap-${vesselId}-${i}`,
                title: 'AIS Dark Window',
                description: `Signal dropped at ${p1.timestamp} [${p1.lat.toFixed(4)}, ${p1.lon.toFixed(4)}] and resumed at ${p2.timestamp} [${p2.lat.toFixed(4)}, ${p2.lon.toFixed(4)}].`,
                timestamp: p2.timestamp,
                data: {
                  vessel_id: vesselId,
                  gap_hours: Number((gapSec / 3600).toFixed(1)),
                  start_coord: [p1.lon, p1.lat],
                  end_coord: [p2.lon, p2.lat],
                  distance_nm: Number(distNm.toFixed(1)),
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
