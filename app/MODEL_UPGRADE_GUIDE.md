# Better Model for Indian Traffic Detection

## Current Performance Bottlenecks
Check your console logs to see timing breakdown:
- **Resize**: Should be ~50-100ms
- **Base64**: Should be ~20-50ms  
- **JPEG decode**: Should be ~30-80ms (SLOWEST PART)
- **RGBA→RGB**: Should be ~5-15ms
- **Model inference**: Should be ~50-150ms
- **Parse output**: Should be ~5-10ms

**Total pipeline target: 200-400ms per frame**

## Why Current Model Misses Vehicles

1. **EfficientDet-Lite0 issues:**
   - Older architecture (2020)
   - Only detects 25 objects max
   - 320x320 input is small
   - Not optimized for Indian traffic

2. **Better alternatives:**
   - YOLOv8n-int8 (faster, more accurate)
   - YOLOv5s (proven, reliable)
   - MobileNetV3-SSD (ultra-fast)

## Getting YOLOv8 TFLite Model

### Option 1: Pre-converted YOLOv8n (Recommended)
```bash
# Download YOLOv8n TFLite INT8 quantized
curl -L -o assets/models/yolov8n.tflite \
  https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n_saved_model.zip

# Extract and use yolov8n_integer_quant.tflite
```

### Option 2: Convert Your Own
```python
from ultralytics import YOLO

# Load YOLOv8n model
model = YOLO('yolov8n.pt')

# Export to TFLite with INT8 quantization
model.export(
    format='tflite',
    imgsz=320,  # Input size
    int8=True,  # INT8 quantization for speed
    nms=True    # Include NMS in model
)
```

### Option 3: Indian Traffic Specific Model
Train custom YOLOv8 on Indian traffic dataset:
```python
from ultralytics import YOLO

model = YOLO('yolov8n.pt')

# Train on Indian traffic dataset
# Dataset should include: auto-rickshaw, two-wheeler, etc.
model.train(
    data='indian_traffic.yaml',
    epochs=100,
    imgsz=320,
    batch=16
)

# Export to TFLite
model.export(format='tflite', int8=True)
```

## Indian Traffic Dataset Sources
1. **IDD (Indian Driving Dataset)**: https://idd.insaan.iiit.ac.in/
2. **Custom annotations**: Use Roboflow with Indian traffic videos
3. **Combine COCO + Custom**: Start with COCO, fine-tune on Indian data

## YOLOv8 Output Format Difference

**Important**: YOLOv8 has different output structure than EfficientDet!

```typescript
// YOLOv8 output structure:
// output[0]: [1, 84, 8400] 
//   - First 4 rows: bbox coords (x, y, w, h)
//   - Remaining 80 rows: class probabilities

// You'll need to update parsing logic in VehicleDetector.tsx
```

## Expected Improvements with YOLOv8

| Metric | EfficientDet-Lite0 | YOLOv8n-int8 |
|--------|-------------------|--------------|
| FPS | 3-5 | 8-12 |
| Accuracy (mAP) | 25.0 | 37.3 |
| Max Detections | 25 | 300+ |
| Model Size | 4.4MB | 6.2MB |
| Inference Time | 70ms | 40ms |

## Quick Test
1. Replace model file: `assets/models/yolov8n.tflite`
2. Update output parsing (see YOLOv8 format above)
3. Run and check console for timing breakdown
4. Adjust confidence threshold based on results

## Performance Tips
- **Fastest component**: Model inference (~50ms)
- **Slowest component**: JPEG decode (~80ms)
- **No way to speed up**: File I/O bottleneck
- **Frame processors would fix this** but they're broken on your device

## Console Output Example (What to Look For)
```
⏱️ Resize: 65ms
⏱️ Base64: 28ms
⏱️ JPEG decode: 82ms  ← BOTTLENECK
⏱️ RGBA→RGB: 8ms
⏱️ Model inference: 54ms
⏱️ Parse output: 6ms
🎯 TOTAL PIPELINE: 243ms | Detected: 3
```

If JPEG decode > 100ms, that's your main bottleneck (can't be fixed without frame processors).
