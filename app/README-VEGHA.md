# On-Device Vehicle Detection App Setup

## ✅ What Has Been Built
- **Stack**: React Native (Expo Prebuild) + Vision Camera + Fast TFLite.
- **Engine**: GPU-accelerated TFLite inference using a separate thread (Frame Processor).
- **Status**: Project is initialized, dependencies installed, native code generated (`android`/`ios` folders).

## 🚀 How to Run

### 1. Get the Model
The app currently has a placeholder file at `assets/models/yolov8n.tflite`.
You need a **real** YOLOv8 TFLite model.
- **Download**: Search for "yolov8n float32 tflite" or export one using Ultralytics.
- **Place it**: Overwrite `assets/models/yolov8n.tflite` with your real file.

### 2. Run on Android
Connect your Android device or start an emulator.
```bash
bun run android
# OR
npx expo run:android
```
*Note: This will compile the native app. It takes a few minutes the first time.*

### 3. Run on iOS
(Requires Mac + Xcode)
```bash
bun run ios
# OR
npx expo run:ios
```

## 🛠 Troubleshooting
- **"Model not found"**: Ensure `metro.config.js` has `'tflite'` in `assetExts` (Done) and you rebuilt the native app if you changed config.
- **"Camera Permission"**: Application should ask for permission on launch.
- **Performance**: The detector is set to run at max 5 FPS (`runAtTargetFps(5)`) to save battery. Remove that wrapper in `VehicleDetector.tsx` for full speed.

## 📁 Key Files
- `src/components/VehicleDetector.tsx`: Main logic (Camera + AI).
- `metro.config.js`: Bundler config for TFLite.
- `app.json`: Native plugins configuration.
