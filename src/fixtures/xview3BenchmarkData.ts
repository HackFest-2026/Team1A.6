/**
 * xView3 Sentinel-1 SAR Vessel Detection Benchmark Fixtures
 * Derived from AI2 Skylight's competition approach (allenai/sar_vessel_detect)
 * Model weights: https://ai2-prior-sarfish.s3.us-west-2.amazonaws.com/public/sarfish-models/xview3-nov20-combo8/model.pth
 * Scene windowing: 800x800 pixel chips with 20px overlap
 * Channels: [VH_dB, VV_dB, bathymetry]
 */

export interface XView3ChipData {
  chip_id: string;
  scene_id: string;
  scene_row_start: number;
  scene_col_start: number;
  center_lat: number;
  center_lon: number;
  channels_available: string[];
  mean_vv_db: number;
  mean_vh_db: number;
  bathymetry_depth_m: number;
  shore_distance_km: number;
  raw_backscatter_intensity_matrix: number[][]; // 20x20 sampled dB grid for radar visualization
  detected_objects: {
    detect_id: string;
    bbox: [number, number, number, number]; // [top, left, bottom, right] in chip pixel coords
    confidence: number;
    is_vessel_prob: number;
    is_fishing_prob: number;
    predicted_length_m: number;
    ground_truth_length_m?: number;
    vessel_class: 'CARGO/TANKER' | 'FISHING' | 'NON-VESSEL' | 'UNKNOWN';
    ground_truth_source: 'ais' | 'sar_manual' | 'unmatched_dark';
    detect_lat: number;
    detect_lon: number;
    rcs_db: number;
    is_dark_vessel: boolean;
  }[];
}

export const XVIEW3_MODEL_METADATA = {
  model_name: 'AI2 Skylight xView3 Faster R-CNN Multihead',
  weights_url: 'https://ai2-prior-sarfish.s3.us-west-2.amazonaws.com/public/sarfish-models/xview3-nov20-combo8/model.pth',
  version: 'nov20-combo8 (ResNet-50 FPN + Multihead Heads)',
  channels: ['VH_dB', 'VV_dB', 'bathymetry'],
  window_size: 800,
  overlap_px: 20,
  padding_px: 400,
  inference_window_size: 3072,
  best_conf_threshold: 0.80,
  nms_threshold: 10,
  distance_tolerance_m: 200,
  source_repo: 'https://github.com/allenai/sar_vessel_detect',
  author: 'AI2 Skylight Team (favyen2)',
  competition: 'Defense Innovation Unit (DIU) xView3 Maritime Prize Challenge',
  license: 'Apache-2.0',
  pipeline_stages: [
    {
      stage: '01_CHIPPING',
      title: 'Scene Preprocessing & Chipping',
      command: 'python -m xview3.processing.preprocessing ../data/configs/chipping_config.txt',
      description: 'Slices massive Sentinel-1 SAR IW GRDH GeoTIFF scenes into 800x800 pixel tiles with 20px overlap and 400px edge padding.',
      parameters: { window_size: 800, overlap: 20, padding: 400, channels: 'VV, VH, Bathymetry' },
    },
    {
      stage: '02_INITIAL_TRAIN',
      title: 'Initial Model Training (Validation Set)',
      command: 'python -m xview3.training.train ../data/configs/initial.txt',
      description: 'Trains Faster R-CNN (ResNet-50 FPN) backbone on 50 comprehensively verified xView3 validation scenes.',
      parameters: { scenes: 50, backbone: 'ResNet-50 FPN', optimizer: 'SGD (lr=0.005)' },
    },
    {
      stage: '03_PSEUDO_LABELING',
      title: 'Semi-Supervised Label Enrichment & NMS Pruning',
      command: 'python -m xview3.infer.inference --weights best.pth --padding 400 --window_size 3072 --overlap 20 && python -m xview3.eval.prune --nms 10 --conf 0.8',
      description: 'Infers on xView3-Train scenes with sliding window 3072px. High-confidence detections (conf >= 0.8) are pruned with NMS 10 and concatenated into ground truth.',
      parameters: { conf_threshold: 0.80, nms_px: 10, window_size: 3072 },
    },
    {
      stage: '04_FINAL_DETECTION',
      title: 'Final Object Detection Model Training',
      command: 'python -m xview3.training.train ../data/configs/final.txt',
      description: 'Retrains detection model on enriched pseudo-labeled dataset to capture non-cooperative dark vessels lacking automated AIS labels.',
      parameters: { dataset: 'xval1b-conf80-concat-prune-drop.csv', loss: 'Smooth L1 + Cross Entropy' },
    },
    {
      stage: '05_ATTRIBUTE_PREDICTION',
      title: 'Multi-head Vessel Attribute Prediction',
      command: 'python -m xview3.postprocess.v2.make_csv chip_annotations.csv out.csv ../data/splits/out.csv',
      description: 'Predicts three critical vessel attributes: is_vessel (distinguish from oil rigs/reefs), is_fishing (IUUs), and estimated length in meters.',
      parameters: { heads: ['is_vessel (binary)', 'is_fishing (binary)', 'length_m (regression)'] },
    },
    {
      stage: '06_AIS_FUSION',
      title: 'Spatio-Temporal Dark Vessel Disambiguation',
      command: 'FusionEngine.computeSpatioTemporalMatchScore(sarDetection, aisTracks)',
      description: 'Correlates georeferenced SAR detection centroids against historical and live AIS tracks within space-time bounding ellipsoids.',
      parameters: { spatial_gate_m: 5000, temporal_gate_sec: 3600, min_match_score: 0.45 },
    },
  ],
};

export const XVIEW3_CHIPS_FIXTURE: XView3ChipData[] = [
  {
    chip_id: 'chip-00a035-saurashtra-01',
    scene_id: '00a035722196ee86t',
    scene_row_start: 21200,
    scene_col_start: 17900,
    center_lat: 22.25,
    center_lon: 68.86,
    channels_available: ['VV_dB', 'VH_dB', 'bathymetry'],
    mean_vv_db: -14.2,
    mean_vh_db: -23.8,
    bathymetry_depth_m: -58.4,
    shore_distance_km: 42.1,
    // 20x20 radar backscatter intensity profile (in dB)
    raw_backscatter_intensity_matrix: [
      [-16, -17, -15, -16, -16, -18, -17, -15, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15],
      [-15, -16, -14, -15, -17, -18, -16, -14, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -14],
      [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16],
      [-16, -15, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16],
      [-15, -16, -18, -16, -14, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -15],
      [-18, -17, -15, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -17],
      [-16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18],
      [-14, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -16],
      [-15, -16, -17, -18, -16,  -2,  +8, +14,  +9,  -3, -15, -16, -17, -18, -16, -15, -16, -17, -18, -15],
      [-16, -17, -18, -16,  -4,  +6, +15, +22, +16,  +2, -14, -15, -16, -17, -18, -16, -15, -16, -17, -16],
      [-17, -18, -16, -15,  -5,  +4, +12, +18, +11,  -1, -16, -17, -18, -16, -15, -16, -17, -18, -16, -17],
      [-18, -16, -15, -16, -17,  -4,  +3,  +7,  +2,  -6, -17, -18, -16, -15, -16, -17, -18, -16, -15, -18],
      [-16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -16],
      [-15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -15],
      [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -17],
      [-16, -15, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16],
      [-18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -18],
      [-16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -16],
      [-15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -15],
      [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -17],
    ],
    detected_objects: [
      {
        detect_id: 'xview3-det-001',
        bbox: [360, 310, 440, 480],
        confidence: 0.94,
        is_vessel_prob: 0.985,
        is_fishing_prob: 0.082,
        predicted_length_m: 278,
        ground_truth_length_m: 274,
        vessel_class: 'CARGO/TANKER',
        ground_truth_source: 'unmatched_dark',
        detect_lat: 22.25,
        detect_lon: 68.86,
        rcs_db: +22.4,
        is_dark_vessel: true, // Ground truth: Sea Dragon during AIS transponder dark window
      },
    ],
  },
  {
    chip_id: 'chip-00a035-okha-patrol-02',
    scene_id: '00a035722196ee86t',
    scene_row_start: 21600,
    scene_col_start: 15200,
    center_lat: 22.22,
    center_lon: 68.78,
    channels_available: ['VV_dB', 'VH_dB', 'bathymetry'],
    mean_vv_db: -15.1,
    mean_vh_db: -24.2,
    bathymetry_depth_m: -42.0,
    shore_distance_km: 28.5,
    raw_backscatter_intensity_matrix: [
      [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16],
      [-16, -15, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -15],
      [-15, -16, -18, -16, -14, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -17],
      [-18, -17, -15, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -16],
      [-16, -15, -16, -17, -18,  -1,  +6, +11,  +4,  -5, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18],
      [-14, -15, -16, -17,  -3,  +5, +14, +19,  +8,  -2, -16, -15, -16, -17, -18, -16, -15, -16, -17, -15],
      [-15, -16, -17, -18,  -2,  +3, +10, +16,  +7,  -4, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16],
      [-16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -17],
      [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -18],
      [-18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -16],
      [-16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15],
      [-15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -17],
      [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16],
      [-16, -15, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -18],
      [-18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -15],
      [-16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -17],
      [-15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16],
      [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -15],
      [-16, -15, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -17],
      [-18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -16],
    ],
    detected_objects: [
      {
        detect_id: 'xview3-det-002',
        bbox: [220, 240, 290, 360],
        confidence: 0.91,
        is_vessel_prob: 0.978,
        is_fishing_prob: 0.041,
        predicted_length_m: 108,
        ground_truth_length_m: 105,
        vessel_class: 'CARGO/TANKER',
        ground_truth_source: 'ais',
        detect_lat: 22.22,
        detect_lon: 68.78,
        rcs_db: +19.1,
        is_dark_vessel: false, // Ground truth: ICGS Samarth patrol vessel
      },
    ],
  },
  {
    chip_id: 'chip-018318-exclusion-intruder-03',
    scene_id: '01831823901bca9ct',
    scene_row_start: 22400,
    scene_col_start: 16300,
    center_lat: 22.42,
    center_lon: 68.85,
    channels_available: ['VV_dB', 'VH_dB', 'bathymetry'],
    mean_vv_db: -13.8,
    mean_vh_db: -22.5,
    bathymetry_depth_m: -34.0,
    shore_distance_km: 14.8,
    raw_backscatter_intensity_matrix: [
      [-15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -15],
      [-16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -16],
      [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -17],
      [-18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -18],
      [-16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -16],
      [-15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -15],
      [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -17],
      [-16, -15, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16],
      [-18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -18],
      [-16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -16],
      [-15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -15],
      [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -17],
      [-16, -15, -17, -18,  -2,  +7, +14,  +8,  -4, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16],
      [-18, -16, -15, -16,  -1, +10, +21, +12,  -2, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -18],
      [-16, -17, -18, -16,  -4,  +5, +13,  +6,  -5, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -16],
      [-15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -15],
      [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -17],
      [-16, -15, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16],
      [-18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -18],
      [-16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -16],
    ],
    detected_objects: [
      {
        detect_id: 'xview3-det-003',
        bbox: [530, 210, 610, 340],
        confidence: 0.96,
        is_vessel_prob: 0.991,
        is_fishing_prob: 0.115,
        predicted_length_m: 138,
        ground_truth_length_m: 135,
        vessel_class: 'CARGO/TANKER',
        ground_truth_source: 'unmatched_dark',
        detect_lat: 22.42,
        detect_lon: 68.85,
        rcs_db: +21.3,
        is_dark_vessel: true, // Ground truth: Dark intruder in naval exclusion sector
      },
    ],
  },
];
