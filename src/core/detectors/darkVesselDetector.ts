/**
 * Dark Vessel Detector Plugin
 * Identifies high-confidence satellite SAR contacts that lack matching AIS tracks in space-time.
 */

import type { Finding } from '../../domain/models.ts';
import { computeSpatioTemporalMatchScore } from '../spatialMath.ts';
import type { IDetectorPlugin, DetectorContext } from './detectorInterface.ts';

export class DarkVesselDetector implements IDetectorPlugin {
  readonly id = 'dark_vessel';
  readonly name = 'Dark Vessel / Uncorrelated SAR Contact';
  readonly version = '1.3.0';
  readonly description = 'Detects satellite SAR vessel contacts with no matching AIS transmissions within space-time gates.';
  readonly defaultWeight = 40;

  evaluate(context: DetectorContext): Finding[] {
    const findings: Finding[] = [];
    const maxGateDistM = context.configParams?.sar_gate_dist_m || 5000;
    const maxGateTimeSec = context.configParams?.sar_gate_time_sec || 3600;

    for (const detection of context.allDetections) {
      const detectionTimeMs = new Date(detection.timestamp).getTime();

      // Only check detections up to the current simulation time
      if (detectionTimeMs > context.currentTimeMs) continue;

      let bestProb = 0;
      let closestVesselId: string | undefined = undefined;
      let minDistance = Infinity;

      for (const [vesselId, track] of Object.entries(context.allTracks)) {
        if (!track.points || track.points.length === 0) continue;

        const match = computeSpatioTemporalMatchScore(
          detection.lon,
          detection.lat,
          detectionTimeMs,
          track.points,
          maxGateDistM,
          maxGateTimeSec
        );

        if (match.probability > bestProb) {
          bestProb = match.probability;
          closestVesselId = vesselId;
          minDistance = match.distanceM;
        }
      }

      // If probability < 0.20, classify as dark vessel
      if (bestProb < 0.20 && detection.confidence >= 0.70) {
        detection.is_dark_vessel = true;
        detection.match_probability = bestProb;

        findings.push({
          rule_id: this.id,
          rule_version: this.version,
          rule_name: this.name,
          category: 'radar_correlation',
          description: `Synthetic Aperture Radar contact detected at [${detection.lat.toFixed(4)}°N, ${detection.lon.toFixed(4)}°E] with no correlating AIS transmitter (match prob: ${(bestProb * 100).toFixed(1)}%).`,
          score_contribution: this.defaultWeight,
          confidence: detection.confidence,
          evidence: [
            {
              id: `ev-sar-${detection.id}`,
              title: 'Sentinel-1 SAR Radar Detection',
              description: `Sensor scene ${detection.source_scene_id} recorded vessel reflection (est. length: ${detection.estimated_length_m || '120'}m, polarization: ${detection.polarization || 'VV'}).`,
              timestamp: detection.timestamp,
              data: {
                detection_id: detection.id,
                coordinates: [detection.lon, detection.lat],
                radar_confidence: detection.confidence,
                scene_id: detection.source_scene_id,
                nearest_ais_distance_m: minDistance === Infinity ? 'None in gate' : Math.round(minDistance),
                match_prob: bestProb,
              },
            },
          ],
        });
      } else if (closestVesselId && bestProb >= 0.20) {
        detection.is_dark_vessel = false;
        detection.matched_vessel_id = closestVesselId;
        detection.match_probability = bestProb;
      }
    }

    return findings;
  }
}
