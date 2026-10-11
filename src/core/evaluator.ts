/**
 * Ground Truth Evaluator for Dark Vessel Matching
 * Benchmarks the Spatio-Temporal Fusion engine against labelled reference detections.
 */

import type { Detection, GroundTruthBenchmark } from '../domain/models.ts';

export interface LabelledDetectionFixture extends Detection {
  ground_truth_label: 'dark_vessel' | 'cooperative';
}

export function evaluateDarkVesselDetection(
  detections: LabelledDetectionFixture[]
): GroundTruthBenchmark {
  let tp = 0; // Predicted Dark, Actually Dark
  let fp = 0; // Predicted Dark, Actually Cooperative
  let fn = 0; // Predicted Cooperative, Actually Dark
  let tn = 0; // Predicted Cooperative, Actually Cooperative

  let trueDark = 0;
  let trueCoop = 0;
  let detectedDark = 0;

  for (const det of detections) {
    const isActualDark = det.ground_truth_label === 'dark_vessel';
    const isPredictedDark = det.is_dark_vessel === true;

    if (isActualDark) trueDark++;
    else trueCoop++;

    if (isPredictedDark) detectedDark++;

    if (isPredictedDark && isActualDark) {
      tp++;
    } else if (isPredictedDark && !isActualDark) {
      fp++;
    } else if (!isPredictedDark && isActualDark) {
      fn++;
    } else {
      tn++;
    }
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1.0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1.0;
  const f1_score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = detections.length > 0 ? (tp + tn) / detections.length : 1.0;

  return {
    total_sar_detections: detections.length,
    true_dark_vessels: trueDark,
    true_cooperative_vessels: trueCoop,
    detected_dark_vessels: detectedDark,
    true_positives: tp,
    false_positives: fp,
    false_negatives: fn,
    true_negatives: tn,
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1_score: Number(f1_score.toFixed(4)),
    accuracy: Number(accuracy.toFixed(4)),
  };
}
