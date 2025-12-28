import tensorflow as tf
import numpy as np

# A simple model to predict Traffic Signal status based on vehicle density.
# Input: 8 counts (Person, Bicycle, Car, Bike, Bus, Truck, TrafficLight, Bird)
# Output: 1 value (Signal Priority/Duration 0.0 - 1.0)

def create_model():
    model = tf.keras.Sequential([
        # Input layer: 8 features (counts of different vehicle types)
        tf.keras.layers.Dense(64, activation='relu', input_shape=(8,)),
        tf.keras.layers.Dense(32, activation='relu'),
        # Output layer: 1 continuous value (Green Light Duration Score)
        tf.keras.layers.Dense(1, activation='sigmoid') 
    ])

    model.compile(optimizer='adam', loss='mse')
    return model

# Train with some dummy data (Logic: More vehicles = Higher score)
def train_dummy(model):
    # data: [person, bike, car, motor, bus, truck, light, bird]
    # logical weights: Bus/Truck=3, Car=1, Bike=0.5
    X_train = np.random.randint(0, 20, size=(1000, 8))
    y_train = []
    
    for row in X_train:
        # Calculate a "Traffic Density Score"
        density = (row[2]*1.0 + row[3]*0.5 + row[4]*3.0 + row[5]*3.0) 
        # Normalize density (assuming max density ~100)
        score = min(density / 50.0, 1.0)
        y_train.append(score)
        
    X_train = np.array(X_train)
    y_train = np.array(y_train)
    
    model.fit(X_train, y_train, epochs=10)
    return model

if __name__ == '__main__':
    model = create_model()
    model = train_dummy(model)
    
    # Save as TFLite
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()

    with open('traffic_signal.tflite', 'wb') as f:
        f.write(tflite_model)
        
    print("✅ Model saved as traffic_signal.tflite")
    print("Input: [Person, Cycle, Car, Bike, Bus, Truck, Light, Bird]")
    print("Output: 0.0 (Green 0s) to 1.0 (Green Max)")
