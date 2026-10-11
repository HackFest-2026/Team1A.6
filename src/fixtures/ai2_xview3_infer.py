"""
AI2 Skylight xView3 SAR Vessel Detection Model Runner
Adapted from official competition code: https://github.com/allenai/sar_vessel_detect
Trained model weights: https://ai2-prior-sarfish.s3.us-west-2.amazonaws.com/public/sarfish-models/xview3-nov20-combo8/model.pth

Usage:
    python src/fixtures/ai2_xview3_infer.py --weights src/model.pth --conf 0.80 --nms 10
"""

import os
import sys
import json
import argparse

# Add repository root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from src.ml.model_engine import XView3Detector, get_model, run_inference_on_chip, DEFAULT_WEIGHTS_PATH

MODEL_WEIGHTS_URL = "https://ai2-prior-sarfish.s3.us-west-2.amazonaws.com/public/sarfish-models/xview3-nov20-combo8/model.pth"
DEFAULT_CONF = 0.80
DEFAULT_NMS = 10

def build_model(weights_path: str = DEFAULT_WEIGHTS_PATH) -> XView3Detector:
    """
    Constructs Faster R-CNN ResNet-50 FPN with 3-channel input [VV, VH, bathymetry]
    and loads the actual 220MB model.pth checkpoint.
    """
    print(f"[INFO] Initializing AI2 Skylight xView3 Faster R-CNN with ResNet-50 FPN...")
    model = get_model(weights_path)
    print(f"[SUCCESS] Model loaded successfully: {model.count_parameters():,} parameters across ResNet-50 FPN + Attribute Heads.")
    return model

def main():
    parser = argparse.ArgumentParser(description="AI2 Skylight xView3 SAR Inference")
    parser.add_argument("--weights", default="src/model.pth", help="Path to downloaded model.pth checkpoint")
    parser.add_argument("--conf", type=float, default=DEFAULT_CONF, help="Confidence threshold (default 0.80)")
    parser.add_argument("--nms", type=int, default=DEFAULT_NMS, help="NMS suppression radius (default 10)")
    parser.add_argument("--json", action="store_true", help="Output result as JSON")
    args = parser.parse_args()

    weights_file = os.path.abspath(args.weights)
    if not os.path.exists(weights_file):
        # Check fallback in src/model.pth
        fallback = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model.pth"))
        if os.path.exists(fallback):
            weights_file = fallback

    print("======================================================================")
    print("      AI2 SKYLIGHT xVIEW3 SAR MARITIME TARGET DETECTION RUNNER        ")
    print("======================================================================")
    print(f"Weights file:     {weights_file}")
    print(f"Confidence limit: {args.conf}")
    print(f"NMS radius:       {args.nms} px")

    detector = build_model(weights_file)

    sample_matrix = [
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
        [-17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -16, -17, -18, -16, -15, -17]
    ]

    print("[RUNNING] Executing PyTorch forward pass on Sentinel-1 SAR test chip...")
    results = run_inference_on_chip(
        model=detector,
        matrix_20x20=sample_matrix,
        chip_id="chip-00a035-saurashtra-01",
        conf_threshold=args.conf,
        nms_radius=args.nms,
    )

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print("\n------------------------- INFERENCE RESULTS -------------------------")
        print(f"Latency:           {results['inference_time_ms']} ms")
        print(f"Detections Found:  {len(results['detections'])}")
        for idx, det in enumerate(results['detections']):
            print(f"  [{idx+1}] ID: {det['detect_id']} | Class: {det['vessel_class']} | Conf: {det['confidence']*100:.1f}%")
            print(f"      BBox (px):       {det['bbox']}")
            print(f"      Is Vessel Prob:  {det['is_vessel_prob']*100:.1f}% | Fishing: {det['is_fishing_prob']*100:.1f}%")
            print(f"      Est. Length:     {det['predicted_length_m']} m | Lat/Lon: {det['detect_lat']}N, {det['detect_lon']}E")
        print(f"CA-CFAR Baseline:  {results['cfarBaseline']['detections_count']} detections ({results['cfarBaseline']['false_alarms']} false alarms rejected by AI2 model)")
        print("---------------------------------------------------------------------")

if __name__ == "__main__":
    main()
