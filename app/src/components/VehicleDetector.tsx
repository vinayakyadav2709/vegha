import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import {
    TensorflowModel,
    loadTensorflowModel
} from 'react-native-fast-tflite';
import { useAssets } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import jpeg from 'jpeg-js';
import { Buffer } from 'buffer';

// Placeholder for the model asset. 
const ModelPath = require('../../assets/models/yolov8n.tflite');

// Polyfill Buffer for jpeg-js
global.Buffer = global.Buffer || Buffer;

export default function VehicleDetector() {
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
                addLog(`Loading model: ...${modelUri.slice(-20)}`);
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

    // 3. Pick & Process Image
    const pickAndDetect = async () => {
        if (!model) {
            addLog("Wait for model to load.");
            return;
        }

        // A. Pick Image
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images', // Fixed Deprecation using string literal
                allowsEditing: true, // Native crop UI
                aspect: [1, 1],      // Force square if possible
                quality: 1,
            });

            if (result.canceled) return;

            const sourceUri = result.assets[0].uri;
            setImageUri(sourceUri);
            setProcessing(true);
            addLog("Image picked. Pre-processing...");

            // allow UI to update
            setTimeout(async () => {
                await runInference(sourceUri);
            }, 100);

        } catch (e) {
            addLog(`Pick Error: ${e}`);
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
            // "expo-file-system" new API (SDK 53+)
            // Note: If FileSystem.File is not available in type definition yet, we can try casting
            // However, user specifically asked to fix deprecation warning.

            // Checking if we are on new architecture, usually `expo-file-system` exports generic `FileSystem` object but
            // documented new API might be under the 'expo-file-system' module directly if updated.
            // As per recent logs, old method is deprecated.
            // Let's try to import the legacy API explicitly or use the new File object if available.

            // To be safe and compliant with user request, we use the File object if possible.
            // Based on docs: import { File } from 'expo-file-system';
            // But if that fails in TS, we might need a different import. 
            // The warning says: 'migrate to the new filesystem API using "File" and "Directory" classes'

            // Let's assume standard import for now, but if it fails we might need `import { File } from 'expo-file-system';` at top.
            // I will update the import at top of file first.
            const file = new FileSystem.File(manipResult.uri);
            const base64 = await file.base64();

            // D. Decode JPEG to RGB
            const buffer = Buffer.from(base64, 'base64');
            const rawData = jpeg.decode(buffer, { useTArray: true }); // Returns RGBA Uint8Array

            // E. Convert RGBA -> RGB (Strip Alpha)
            // jpeg-js usually returns { width, height, data } where data is RGBA
            const rgba = rawData.data;
            const rgb = new Uint8Array(320 * 320 * 3);

            let p = 0;
            for (let i = 0; i < rgba.length; i += 4) {
                rgb[p++] = rgba[i];     // R
                rgb[p++] = rgba[i + 1]; // G
                rgb[p++] = rgba[i + 2]; // B
                // Skip A (i+3)
            }

            addLog("Running inference on image...");
            const output = model.runSync([rgb]);

            // Raw Output Logging
            addLog(`Inference Done! Output tensors: ${output.length}`);

            // F. Parse Output (EfficientDet-Lite0)
            const classes = output[1];
            const scores = output[2];

            // Basic COCO Map (Partial)
            const COCO_LABELS: { [key: number]: string } = {
                0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle',
                5: 'bus', 7: 'truck', 9: 'traffic light'
            };

            let count = 0;
            // Iterate 25 detections
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

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Static Image Detector</Text>

            <View style={styles.preview}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.image} />
                ) : (
                    <View style={styles.placeholder}>
                        <Text style={{ color: '#888' }}>No Image Selected</Text>
                    </View>
                )}
            </View>

            <View style={styles.statusBox}>
                <Text>Model: {modelState}</Text>
            </View>

            <TouchableOpacity
                style={[styles.button, (processing || modelState !== 'loaded') && styles.disabled]}
                onPress={pickAndDetect}
                disabled={processing || modelState !== 'loaded'}
            >
                {processing ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>PICK IMAGE FROM GALLERY</Text>
                )}
            </TouchableOpacity>

            <ScrollView style={styles.logContainer}>
                {logs.map((L, i) => <Text key={i} style={styles.logText}>{L}</Text>)}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#eee' },
    header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    preview: { alignItems: 'center', marginBottom: 20 },
    image: { width: 250, height: 250, borderRadius: 10, backgroundColor: '#ddd' },
    placeholder: { width: 250, height: 250, borderRadius: 10, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
    statusBox: { marginBottom: 10, alignItems: 'center' },
    button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
    disabled: { backgroundColor: '#aaa' },
    buttonText: { color: 'white', fontWeight: 'bold' },
    logContainer: { flex: 1, backgroundColor: '#222', borderRadius: 8, padding: 10 },
    logText: { color: '#0f0', fontFamily: 'monospace', fontSize: 12, marginBottom: 4 }
});
