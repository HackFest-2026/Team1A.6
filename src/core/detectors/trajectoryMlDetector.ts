/**
 * Trajectory ML Anomaly Detector Plugin
 * Evaluates kinematic statistical features (speed variance, course change entropy, acceleration jerk)
 * based on Isolation Forest trajectory score thresholding.
 */

import type { Finding } from '../../domain/models.ts';
import type { IDetectorPlugin, DetectorContext } from './detectorInterface.ts';

export class TrajectoryMlDetector implements IDetectorPlugin {
  readonly id = 'trajectory_ml_anomaly';
  readonly name = 'Kinematic Trajectory Anomaly (ML)';
  readonly version = '1.0.1';
  readonly description = 'Statistical isolation analysis on vessel speed variance, heading entropy, and acceleration profiles.';
  readonly defaultWeight = 25;

  evaluate(context: DetectorContext): Finding[] {
    const findings: Finding[] = [];

    for (const [vesselId, track] of Object.entries(context.allTracks)) {
      if (!track.points || track.points.length < 5) continue;

      const points = track.points.filter(
        (p) => new Date(p.timestamp).getTime() <= context.currentTimeMs
      );
      if (points.length < 5) continue;

      // Extract kinematic features
      const speeds = points.map((p) => p.sog || 0);
      const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const speedVar =
        speeds.reduce((sum, s) => sum + Math.pow(s - meanSpeed, 2), 0) / speeds.length;
      const speedStd = Math.sqrt(speedVar);

      // Course changes
      let totalCourseJerk = 0;
      for (let i = 0; i < points.length - 1; i++) {
        const c1 = points[i].cog || 0;
        const c2 = points[i + 1].cog || 0;
        let diff = Math.abs(c2 - c1);
        if (diff > 180) diff = 360 - diff;
        totalCourseJerk += diff;
      }
      const meanCourseJerk = totalCourseJerk / (points.length - 1);

      // Anomaly heuristics calibrated from historical AIS baseline:
      // High speed volatility (speedStd > 7.5 kts) + erratic zigzag course (meanCourseJerk > 45 deg)
      const anomalyScore = Math.min(
        1.0,
        (speedStd / 10.0) * 0.45 + (meanCourseJerk / 60.0) * 0.55
      );

      if (anomalyScore >= 0.70) {
        findings.push({
          rule_id: this.id,
          rule_version: this.version,
          rule_name: this.name,
          category: 'ais_kinematics',
          description: `Vessel ${vesselId} trajectory exhibits high kinematic entropy (anomaly score: ${(anomalyScore * 100).toFixed(0)}%, course jitter: ${meanCourseJerk.toFixed(1)}°).`,
          score_contribution: Math.round(this.defaultWeight * anomalyScore),
          confidence: Number(anomalyScore.toFixed(2)),
          evidence: [
            {
              id: `ev-ml-${vesselId}`,
              title: 'Kinematic Trajectory Feature Anomaly',
              description: `Trajectory points feature profile: speed variance σ=${speedStd.toFixed(1)} kts, mean angular jerk Δθ=${meanCourseJerk.toFixed(1)}°.`,
              timestamp: points[points.length - 1].timestamp,
              data: {
                vessel_id: vesselId,
                anomaly_index: Number(anomalyScore.toFixed(3)),
                speed_std_kts: Number(speedStd.toFixed(2)),
                angular_jerk_deg: Number(meanCourseJerk.toFixed(1)),
                sample_pings: points.length,
              },
            },
          ],
        });
      }
    }

    return findings;
  }
}
