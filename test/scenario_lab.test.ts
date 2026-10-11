/**
 * Automated Test Suite for Scenario Lab & Evaluation Center
 * Tests Scenarios A through F, Validation, Ingestion, Fusion & Export Bundles
 */

import { ScenarioService } from '../src/core/scenarioService.ts';
import { FusionEngine } from '../src/core/fusionEngine.ts';

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

async function runScenarioLabTests() {
  console.log('\n=============================================================');
  console.log('   NAVAL SENTINEL — SCENARIO LAB AUTOMATED TEST SUITE');
  console.log('=============================================================\n');

  const scenarioService = ScenarioService.getInstance();

  // 1. SCENARIO CARDS & READINESS
  console.log('--- TEST SUITE 1: Scenario Cards Configuration ---');
  const cards = await scenarioService.getScenarioCards();
  assert(cards.length === 6, 'Six distinct scenario cards registered (A through F)');
  assert(cards.some((c) => c.id === 'sar_detection'), 'Scenario A: SAR Maritime Vessel Detection is present');
  assert(cards.some((c) => c.id === 'uav_optical'), 'Scenario B: UAV Optical Image Detection is present');
  assert(cards.some((c) => c.id === 'uav_video'), 'Scenario C: UAV Video Detection and Tracking is present');
  assert(cards.some((c) => c.id === 'ais_csv'), 'Scenario D: AIS CSV Track Import is present');
  assert(cards.some((c) => c.id === 'gfw_live'), 'Scenario E: Global Fishing Watch Live API is present');
  assert(cards.some((c) => c.id === 'multimodal_fusion'), 'Scenario F: Multimodal Fusion & Threat Scoring is present');

  // 2. AIS CSV VALIDATION
  console.log('\n--- TEST SUITE 2: AIS CSV Ingestion & Validation ---');
  const sampleCsv = scenarioService.getSampleAisCsv();
  const validSummary = scenarioService.validateAisCsv(sampleCsv);
  assert(validSummary.totalRows === 6, 'Valid sample CSV parses all 6 records');
  assert(validSummary.acceptedRows === 6, 'All 6 sample records pass coordinate and MMSI validation');
  assert(validSummary.rejectedRows === 0, 'Zero rejections on clean AIS template');

  // Test Corrupt & Malformed CSV
  const corruptCsv = `mmsi,lat,lon,timestamp\n` +
    `000000000,22.1,68.9,2026-10-08T00:00:00Z\n` + // Invalid MMSI
    `419001245,145.2,68.9,2026-10-08T00:00:00Z\n` + // Out of range Lat (145.2)
    `419001245,22.1,-250.0,2026-10-08T00:00:00Z\n` + // Out of range Lon (-250.0)
    `419001245,22.1,68.9,2026-10-08T00:00:00Z\n` +   // Valid
    `419001245,22.1,68.9,2026-10-08T00:00:00Z\n`;    // Duplicate

  const corruptSummary = scenarioService.validateAisCsv(corruptCsv);
  assert(corruptSummary.rejectedRows >= 3, 'Corrupt coordinates and invalid MMSI are rejected');
  assert(corruptSummary.duplicateRows === 1, 'Duplicate row is identified and deduplicated');
  assert(corruptSummary.acceptedRows === 1, 'Single valid record is accepted without data pollution');
  assert(corruptSummary.errors.length > 0, 'Row-level errors list generated with specific line explanations');

  // Test AIS Ingestion into Fusion Engine
  const importResult = scenarioService.importAisRecords(validSummary.previewRows);
  assert(importResult.importedCount === 6, 'Imported records ingested into FusionEngine memory');

  // 3. SCENARIO A: SAR MARITIME DETECTION & AIS CORRELATION
  console.log('\n--- TEST SUITE 3: Scenario A — SAR Maritime Vessel Detection ---');
  const sarJob = scenarioService.createJob('sar_detection');
  const sarResult = await scenarioService.executeSarScenario(sarJob.id, {
    confThreshold: 0.70,
    distanceToleranceMeters: 5000,
  });
  assert(sarResult.totalCandidates > 0, 'SAR pipeline yields candidate vessel returns');
  assert(Array.isArray(sarResult.correlations), 'AIS spatial correlation generated for all candidates');
  assert(
    sarResult.correlations.every((c: any) =>
      ['AIS Matched', 'Unmatched SAR Candidate', 'Ambiguous Match'].includes(c.status)
    ),
    'Correlations strictly categorized into Matched, Unmatched, or Ambiguous'
  );
  assert(
    sarResult.correlations.some((c: any) => c.status === 'Unmatched SAR Candidate'),
    'Identifies dark vessel candidates with zero correlating AIS broadcasts'
  );

  // 4. SCENARIO B: UAV OPTICAL IMAGE DETECTION (VISDRONE YOLOV8)
  console.log('\n--- TEST SUITE 4: Scenario B — UAV Optical Image Detection ---');
  const uavJob = scenarioService.createJob('uav_optical');
  const uavResultWithGeo = await scenarioService.executeUavImageScenario(uavJob.id, {
    confThreshold: 0.40,
    cameraMetadata: { cameraLat: 22.314, cameraLon: 68.825, altitudeM: 350, pitchDeg: -80, headingDeg: 45 },
  });
  assert(uavResultWithGeo.detections_count > 0, 'UAV inference detects aerial objects');
  assert(
    uavResultWithGeo.georeferenceStatus === 'GEOREFERENCED',
    'Detections flagged GEOREFERENCED when camera GPS & orientation telemetry provided'
  );

  const uavJobNoGeo = scenarioService.createJob('uav_optical');
  const uavResultNoGeo = await scenarioService.executeUavImageScenario(uavJobNoGeo.id, {
    confThreshold: 0.40,
    cameraMetadata: undefined,
  });
  assert(
    uavResultNoGeo.georeferenceStatus === 'UNREFERENCED',
    'Detections strictly flagged UNREFERENCED when camera coordinates absent'
  );

  // 5. SCENARIO C: UAV VIDEO DETECTION & TRACKING
  console.log('\n--- TEST SUITE 5: Scenario C — UAV Video Tracking ---');
  const videoJob = scenarioService.createJob('uav_video');
  const videoResult = await scenarioService.executeUavVideoScenario(videoJob.id, {
    confThreshold: 0.45,
    maxFrames: 30,
    enableTracking: true,
  });
  assert(videoResult.frames_processed === 30, 'Sequential frame pipeline processed specified frame batch');
  assert(videoResult.active_tracks > 0, 'Multi-object tracker maintains persistent tracker IDs');
  assert(videoResult.effectiveFps > 0, 'Effective frames per second throughput recorded');

  // 6. SCENARIO E: GLOBAL FISHING WATCH LIVE API CONTRACT
  console.log('\n--- TEST SUITE 6: Scenario E — GFW Live API Contract & Privacy ---');
  const gfwWithoutToken = await scenarioService.fetchGfwEventsLive(
    'public-global-encounters-events:latest',
    '2026-10-01',
    '2026-10-08',
    10
  );
  if (!process.env.GFW_API_TOKEN) {
    assert(
      gfwWithoutToken.status === 'NOT CONFIGURED',
      'Honest NOT CONFIGURED status reported when server GFW_API_TOKEN is absent'
    );
    assert(
      gfwWithoutToken.events.length === 0,
      'Never fabricates fake live records when live API is unconfigured'
    );
  } else {
    assert(
      gfwWithoutToken.status === 'LIVE' || gfwWithoutToken.status === 'API ERROR',
      'Real GFW API call executes and returns honest response'
    );
  }

  // 7. SCENARIO F: MULTIMODAL FUSION
  console.log('\n--- TEST SUITE 7: Scenario F — Cross-Modality Fusion ---');
  const fusionResult = scenarioService.executeMultimodalFusion({
    includeAis: true,
    includeGfw: true,
    spatialRadiusMeters: 4000,
    temporalWindowMinutes: 60,
  });
  assert(fusionResult.success === true, 'Multimodal fusion pipeline executes successfully');
  assert(fusionResult.totalFusedAlerts > 0, 'Generates fused alerts with cross-modality evidence');
  assert(
    fusionResult.alerts.every((a: any) => Array.isArray(a.modalities) && a.modalities.length > 0),
    'Each fused alert documents contributing sensor modalities'
  );

  // 8. EVIDENCE EXPORTS & PRIVACY
  console.log('\n--- TEST SUITE 8: Evidence Bundle Exports & Privacy ---');
  const jsonExport = scenarioService.generateExportBundle(sarJob.id, 'json');
  assert(jsonExport.mimeType === 'application/json', 'JSON evidence export produces application/json');
  assert(!jsonExport.content.includes('MY_GEMINI_API_KEY') && !jsonExport.content.includes('GFW_API_TOKEN'), 'Export bundle strips sensitive API credentials');

  const csvExport = scenarioService.generateExportBundle(sarJob.id, 'csv');
  assert(csvExport.mimeType === 'text/csv', 'CSV export produces text/csv metrics');

  const mdExport = scenarioService.generateExportBundle(sarJob.id, 'markdown');
  assert(mdExport.mimeType === 'text/markdown', 'Markdown SITREP export produces tactical report');
  assert(mdExport.content.includes('OPERATIONAL EVALUATION SITREP'), 'SITREP contains standardized operational header');

  console.log('\n=============================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} total assertions.`);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runScenarioLabTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
