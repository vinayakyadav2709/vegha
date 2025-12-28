import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import {
    Camera,
    useCameraDevice,
    useCameraPermission
} from 'react-native-vision-camera';
import {
    TensorflowModel,
    loadTensorflowModel
} from 'react-native-fast-tflite';
import { useAssets } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import jpeg from 'jpeg-js';
import { Buffer } from 'buffer';

// Placeholder for the model asset. 
const ModelPath = require('../../assets/models/yolov8n.tflite');

// Polyfill Buffer for jpeg-js
global.Buffer = global.Buffer || Buffer;

export default function VehicleDetector() {
    const device = useCameraDevice('back');
    const { hasPermission, requestPermission } = useCameraPermission();
    const cameraRef = useRef<Camera>(null);

    const [modelUri, setModelUri] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const addLog = (msg: string) => {
        console.log(msg);
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    // 1. Load Asset from Expo Bundle
    const [assets] = useAssets([ModelPath]);
    useEffect(() => {
        if (assets && assets[0]) setModelUri(assets[0].localUri || assets[0].uri);
    }, [assets]);

    // 2. Load Model
    const [model, setModel] = useState<TensorflowModel | null>(null);
    const [modelState, setModelState] = useState<'loading' | 'loaded' | 'error'>('loading');

    useEffect(() => {
        async function load() {
            if (!modelUri) return;
            try {
                setModelState('loading');
                addLog(`Loading model...`);
                const m = await loadTensorflowModel({ url: modelUri });

                // Warmup
                addLog('Model loaded! Warming up...');
                try {
                    const dummy = new Uint8Array(320 * 320 * 3);
                    m.runSync([dummy]);
                    addLog('Warmup complete.');
                } catch (e) { console.error(e); }

                setModel(m);
                setModelState('loaded');
            } catch (e) {
                addLog(`Error loading model: ${e}`);
                setModelState('error');
            }
        }
        load();
    }, [modelUri]);

    useEffect(() => {
        requestPermission();
    }, [requestPermission]);

    // 3. Capture Photo & Process
    const captureAndDetect = async () => {
        if (!model) {
            addLog("Wait for model to load.");
            return;
        }

        if (!cameraRef.current) {
            addLog("Camera not ready");
            return;
        }

        try {
            setProcessing(true);
            addLog("Capturing photo...");

            const photo = await cameraRef.current.takePhoto({
                flash: 'off',
            });

            const sourceUri = `file://${photo.path}`;
            setImageUri(sourceUri);
            addLog("Photo captured. Processing...");

            // Allow UI to update
            setTimeout(async () => {
                await runInference(sourceUri);
            }, 100);

        } catch (e) {
            addLog(`Capture Error: ${e}`);
            setProcessing(false);
        }
    };

    const runInference = async (filesUri: string) => {
        try {
            if (!model) return;

            // B. Resize to 320x320 strictly using Manipulator
            const manipResult = await ImageManipulator.manipulateAsync(
                filesUri,
                [{ resize: { width: 320, height: 320 } }],
                { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
            );

            // C. Read as Base64 to decode pixels in JS
            const file = new FileSystem.File(manipResult.uri);
            const base64 = await file.base64();

            // D. Decode JPEG to RGB
            const buffer = Buffer.from(base64, 'base64');
            const rawData = jpeg.decode(buffer, { useTArray: true }); // Returns RGBA Uint8Array

            // E. Convert RGBA -> RGB (Strip Alpha)
            const rgba = rawData.data;
            const rgb = new Uint8Array(320 * 320 * 3);

            let p = 0;
            for (let i = 0; i < rgba.length; i += 4) {
                rgb[p++] = rgba[i];     // R
                rgb[p++] = rgba[i + 1]; // G
                rgb[p++] = rgba[i + 2]; // B
            }

            addLog("Running inference...");
            const output = model.runSync([rgb]);

            // F. Parse Output (EfficientDet-Lite0)
            const classes = output[1];
            const scores = output[2];

            // Basic COCO Map (Partial)
            const COCO_LABELS: { [key: number]: string } = {
                0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle',
                5: 'bus', 7: 'truck', 9: 'traffic light'
            };

            let count = 0;
            for (let i = 0; i < 25; i++) {
                const score = Number(scores[i]);
                if (score > 0.4) {
                    const classId = Number(classes[i]);
                    const label = COCO_LABELS[classId] || `Class ${classId}`;
                    addLog(`✅ FOUND: ${label} (${(score * 100).toFixed(0)}%)`);
                    count++;
                }
            }
            if (count === 0) addLog("No objects detected > 40%");

            setProcessing(false);

        } catch (e) {
            addLog(`Inference Error: ${e}`);
            setProcessing(false);
        }
    };

    if (!hasPermission) return <Text style={styles.center}>Requesting Camera...</Text>;
    if (device == null) return <Text style={styles.center}>No Camera Device</Text>;
    if (modelState !== 'loaded') return <Text style={styles.center}>Loading Model...</Text>;

    return (
        <View style={styles.container}>
            {/* Camera Preview */}
            <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                photo={true}
            />

            {/* Captured Image Preview */}
            {imageUri && (
                <View style={styles.imagePreview}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                </View>
            )}

            {/* Bottom Controls */}
            <View style={styles.controls}>
                <View style={styles.statusBox}>
                    <Text style={styles.statusText}>Model: {modelState}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.captureButton, processing && styles.disabled]}
                    onPress={captureAndDetect}
                    disabled={processing}
                >
                    {processing ? (
                        <ActivityIndicator color="white" size="large" />
                    ) : (
                        <View style={styles.captureButtonInner} />
                    )}
                </TouchableOpacity>

                <ScrollView style={styles.logContainer}>
                    {logs.map((L, i) => <Text key={i} style={styles.logText}>{L}</Text>)}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, textAlign: 'center', textAlignVertical: 'center', color: 'white', fontSize: 18 },
    imagePreview: {
        position: 'absolute',
        top: 50, right: 20,
        width: 120, height: 120,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#0f0'
    },
    previewImage: { width: '100%', height: '100%' },
    controls: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingBottom: 40,
        paddingTop: 20,
        paddingHorizontal: 20
    },
    statusBox: { alignItems: 'center', marginBottom: 15 },
    statusText: { color: '#0f0', fontWeight: 'bold', fontSize: 14 },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 4,
        borderColor: 'white'
    },
    disabled: { opacity: 0.5 },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white'
    },
    logContainer: { maxHeight: 150, backgroundColor: '#222', borderRadius: 8, padding: 10 },
    logText: { color: '#0f0', fontFamily: 'monospace', fontSize: 12, marginBottom: 4 }
});
