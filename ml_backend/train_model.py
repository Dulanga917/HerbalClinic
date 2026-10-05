import json
import os

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.environ.get(
    'AYURVEDA_DATASET',
    os.path.abspath(os.path.join(SCRIPT_DIR, '..', 'ai_dataset')),
)
BATCH_SIZE = 32
IMG_SIZE = (224, 224)
OUTPUT_DIR = SCRIPT_DIR

print("Loading dataset into memory...")

# 1. Load Data
train_dataset = tf.keras.utils.image_dataset_from_directory(
    DATASET_PATH, validation_split=0.2, subset="training", seed=123,
    image_size=IMG_SIZE, batch_size=BATCH_SIZE)

val_dataset = tf.keras.utils.image_dataset_from_directory(
    DATASET_PATH, validation_split=0.2, subset="validation", seed=123,
    image_size=IMG_SIZE, batch_size=BATCH_SIZE)

class_names = train_dataset.class_names
print(f"✅ Classes: {class_names}")

AUTOTUNE = tf.data.AUTOTUNE
train_dataset = train_dataset.cache().shuffle(1000).prefetch(buffer_size=AUTOTUNE)
val_dataset = val_dataset.cache().prefetch(buffer_size=AUTOTUNE)

# 2. Data Augmentation (The secret sauce!)
# This randomly flips and zooms photos so the AI learns to handle bad selfies
data_augmentation = tf.keras.Sequential([
  tf.keras.layers.RandomFlip('horizontal'),
  tf.keras.layers.RandomRotation(0.2),
  tf.keras.layers.RandomZoom(0.2),
])

print("Downloading MobileNetV2 base brain...")
# 3. Load the pre-trained Google AI (MobileNetV2)
preprocess_input = tf.keras.applications.mobilenet_v2.preprocess_input
base_model = tf.keras.applications.MobileNetV2(input_shape=(224, 224, 3),
                                               include_top=False, # We drop their classification layer
                                               weights='imagenet')
base_model.trainable = False # Freeze the brain so we don't overwrite its basic knowledge

# 4. Build OUR specific Ayurvedic Model
inputs = tf.keras.Input(shape=(224, 224, 3))
x = data_augmentation(inputs)
x = preprocess_input(x)
x = base_model(x, training=False)
x = tf.keras.layers.GlobalAveragePooling2D()(x)
x = tf.keras.layers.Dropout(0.2)(x) # Drop 20% of connections to prevent overfitting
outputs = tf.keras.layers.Dense(4, activation='softmax')(x) # 4 outputs for our 4 classes

model = tf.keras.Model(inputs, outputs)

# 5. Compile the Model
model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
              loss=tf.keras.losses.SparseCategoricalCrossentropy(),
              metrics=['accuracy'])

print("🚀 Starting AI Training (This will take a few minutes...)")

# 6. Train the model! We will do 5 "Epochs" (rounds of studying) to start.
history = model.fit(train_dataset, validation_data=val_dataset, epochs=5)

# 7. Save the trained brain to a file
keras_path = os.path.join(OUTPUT_DIR, 'dosha_model.keras')
labels_path = os.path.join(OUTPUT_DIR, 'class_names.json')
history_path = os.path.join(OUTPUT_DIR, 'history.json')
model.save(keras_path)
with open(labels_path, 'w', encoding='utf-8') as labels_file:
    json.dump({'labels': list(class_names)}, labels_file, indent=2)
print(f"✅ SUCCESS: Model trained and saved as '{keras_path}'!")

# 8. Save metrics for the thesis (Table 5.4) and print a confusion matrix (Section 5.7)
with open(history_path, 'w', encoding='utf-8') as history_file:
    json.dump(history.history, history_file)

print("\n=== FINAL METRICS ===")
print("Training Accuracy   : %.2f%%" % (history.history['accuracy'][-1] * 100))
print("Validation Accuracy : %.2f%%" % (history.history['val_accuracy'][-1] * 100))
print("Training Loss       : %.4f" % history.history['loss'][-1])
print("Validation Loss     : %.4f" % history.history['val_loss'][-1])

y_true = np.concatenate([y.numpy() for _, y in val_dataset])
y_pred = np.argmax(model.predict(val_dataset), axis=1)

print("\n=== CONFUSION MATRIX (rows=actual, cols=predicted) ===")
print("Classes:", class_names)
print(confusion_matrix(y_true, y_pred))
print("\n=== CLASSIFICATION REPORT ===")
print(classification_report(y_true, y_pred, target_names=class_names))
