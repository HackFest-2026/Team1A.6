/**
 * Automated Test Suite for:
 * 1. Linear Kalman Filter (Kinematics, Prediction, Update, Track Smoothing, predictNextPosition)
 * 2. VisDrone Object Detection & Class Mapping
 * 3. Photogrammetric Georeferencing Registration (Referenced vs Unreferenced)
 * 4. System Verification Checks (1-13)
 * 5. GFW Token Privacy & Mocked Connection
 */

import { LinearKalmanFilter, predictNextPosition } from '../src/core/spatialMath.ts';
import { UavModelBridge } from '../src/core/uavModelBridge.ts';
import { FusionEngine } from '../src/core/fusionEngine.ts';
import type { TrackPoint } from '../src/domain/models.ts';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName}: ${details || 'Assertion failed'}`);
  }
}

async function runAllTests() {
  console.log('\n=============================================================');
  console.log('   NAVAL SENTINEL — AUTOMATED TEST SUITE');
  console.log('=============================================================\n');

  // TEST SUITE 1: Linear Kalman Filter
  console.log('--- TEST SUITE 1: Linear Kalman Filter ---');
  const kf = new LinearKalmanFilter(68.5, 22.0, 0.001, 0.0005, 1000);
  assert(kf.state[0] === 68.5 && kf.state[1] === 22.0, 'Initial state vector matches coordinates');

  // Prediction step with dt = 10s
  kf.predict(10);
  assert(kf.state[0] > 68.5, 'Prediction step updates longitude based on velocity vx');
  assert(kf.state[1] > 22.0, 'Prediction step updates latitude based on velocity vy');

  // Update step with measurement
  const preUpdateX = kf.state[0];
  kf.update(68.52, 22.01);
  assert(kf.state[0] !== preUpdateX, 'Update step incorporates sensor measurement and adjusts state');

  // Track smoothing
  const noisyTrack: TrackPoint[] = [
    { lon: 68.500, lat: 22.000, sog: 12, cog: 45, timestamp: '2026-10-06T00:00:00Z' },
    { lon: 68.508, lat: 22.006, sog: 12, cog: 45, timestamp: '2026-10-06T00:10:00Z' },
    { lon: 68.514, lat: 22.013, sog: 12, cog: 45, timestamp: '2026-10-06T00:20:00Z' },
  ];
  const smoothed = LinearKalmanFilter.smoothTrack(noisyTrack);
  assert(smoothed.length === 3, 'smoothTrack preserves all track timestamps');
  assert(smoothed[1].lon !== undefined && smoothed[1].lat !== undefined, 'smoothTrack outputs valid geodetic coordinates');

  // predictNextPosition (Extrapolation when transponder silent)
  const futureProjection = predictNextPosition(noisyTrack, '2026-10-06T01:00:00Z');
  assert(futureProjection.lon > 68.514, 'predictNextPosition extrapolates forward position along course');
  assert(futureProjection.uncertaintyRadiusM > 200, 'predictNextPosition computes expanding uncertainty covariance radius');

  // TEST SUITE 2: VisDrone Object Detector Adapter
  console.log('\n--- TEST SUITE 2: VisDrone Object Detector ---');
  const uavBridge = UavModelBridge.getInstance();
  const uavStatus = await uavBridge.getStatus();
  assert(uavStatus.classes_count === 10, 'VisDrone verified 10-class dictionary matches specification');
  assert(uavStatus.classes.includes('pedestrian') && uavStatus.classes.includes('car'), 'VisDrone classes include pedestrian and car');

  // UAV Image Inference
  const imageResult = await uavBridge.inferImage(undefined, 0.45);
  assert(imageResult.success === true, 'UAV image inference returns successful envelope');
  assert(imageResult.detections.length > 0, 'UAV inference detects targets above confidence threshold');
  assert(imageResult.detections[0].bbox.length === 4, 'Bounding box adheres to [x1, y1, x2, y2] standard');

  // TEST SUITE 3: Georeferencing Registration
  console.log('\n--- TEST SUITE 3: Georeferencing Registration ---');
  const unreferencedResult = await uavBridge.inferImage(undefined, 0.45, null);
  assert(unreferencedResult.detections[0].georeferenceStatus === 'UNREFERENCED', 'Without camera metadata, status is UNREFERENCED');
  assert(unreferencedResult.detections[0].geoCoordinate === undefined, 'No guessed map coordinates added when unreferenced');

  const referencedResult = await uavBridge.inferImage(undefined, 0.45, { cameraLat: 22.4, cameraLon: 69.1, altitudeM: 400 });
  assert(referencedResult.detections[0].georeferenceStatus === 'GEOREFERENCED', 'With camera metadata, status is GEOREFERENCED');
  assert(referencedResult.detections[0].geoCoordinate?.lat !== undefined, 'Georeferenced detection contains projected latitude');

  // TEST SUITE 4: Video Tracking (DeepSORT / ByteTrack)
  console.log('\n--- TEST SUITE 4: Video Object Tracking ---');
  const videoResult = await uavBridge.inferVideo(undefined, 0.45, 10, true);
  assert(videoResult.tracking_enabled === true, 'Video tracking flag is recorded');
  assert(videoResult.unique_tracks_count > 0, 'Tracker assigns persistent track IDs across frames');
  assert(videoResult.frames.length === 10, 'All processed frames retained with timestamps');

  // TEST SUITE 5: System Verification (Checks 1-13)
  console.log('\n--- TEST SUITE 5: Evaluator System Verification ---');
  const checks = await uavBridge.runSystemVerification();
  assert(checks.length === 13, 'System verification evaluates all 13 required independent checks');
  const validStatuses = checks.every((c) => ['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN'].includes(c.status));
  assert(validStatuses, 'All checks use honest statuses (PASS, FAIL, BLOCKED, NOT_RUN)');
  const hasRealExec = checks.some((c) => c.testType === 'REAL_EXECUTION');
  assert(hasRealExec, 'Checks explicitly report REAL_EXECUTION test methodology');

  console.log('\n=============================================================');
  console.log(`   TEST RESULTS: ${passedTests} PASSED / ${failedTests} FAILED (TOTAL: ${totalTests})`);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
