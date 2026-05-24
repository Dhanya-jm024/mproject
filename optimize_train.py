import os
import tensorflow as tf
from tensorflow.keras import models, layers

# CONFIGURATION
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 5
DATASET_PATH = "/Users/jmdhanyakumar/Desktop/MPROJECT/dataset"
ORIGINAL_MODEL_PATH = "/Users/jmdhanyakumar/Desktop/MPROJECT/models/tomato_disease_model.keras"
OPTIMIZED_MODEL_PATH = "/Users/jmdhanyakumar/Desktop/MPROJECT/models/tomato_disease_model_optimized.keras"

def main():
    print("-----------------------------------------------------------------------------")
    print("🍅 AgriVision: Starting Deep Learning Model Optimization & Fine-Tuning 🍅")
    print("-----------------------------------------------------------------------------")

    # 1. LOAD DATASET
    print("\n[1/5] Loading tomato crop leaf dataset...")
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset path not found: {DATASET_PATH}")
        
    train_ds = tf.keras.preprocessing.image_dataset_from_directory(
        DATASET_PATH,
        validation_split=0.2,
        subset="training",
        seed=123,
        image_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE
    )

    val_ds = tf.keras.preprocessing.image_dataset_from_directory(
        DATASET_PATH,
        validation_split=0.2,
        subset="validation",
        seed=123,
        image_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE
    )

    # Configure dataset performance
    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.cache().shuffle(1000).prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)

    # 2. LOAD PRE-TRAINED MODEL
    print("\n[2/5] Loading pre-trained MobileNetV2 classification model...")
    if os.path.exists(ORIGINAL_MODEL_PATH):
        model_to_load = ORIGINAL_MODEL_PATH
    else:
        # Fallback to .h5 if .keras is not available
        model_to_load = "/Users/jmdhanyakumar/Desktop/MPROJECT/models/tomato_disease_model.h5"
        if not os.path.exists(model_to_load):
            raise FileNotFoundError("No pre-trained model found to optimize! Please run train.ipynb first.")
            
    print(f"Loading weights from: {model_to_load}")
    model = tf.keras.models.load_model(model_to_load)
    
    # 3. UNFREEZE UPPER LAYERS OF THE BACKBONE
    print("\n[3/5] Unfreezing upper MobileNetV2 layers for high-precision fine-tuning...")
    
    # Find the MobileNetV2 base model inside the sequential wrapper
    base_model = None
    for layer in model.layers:
        if layer.name.startswith("mobilenetv2"):
            base_model = layer
            break
            
    if base_model is None:
        print("Warning: Could not find MobileNetV2 layer inside model sequential wrapper. Optimizing all layers...")
        model.trainable = True
    else:
        # Unfreeze the base model
        base_model.trainable = True
        
        # Freezing the lower layers, unfreezing only the top 40 layers of MobileNetV2
        # MobileNetV2 has ~154 layers in total
        fine_tune_at = len(base_model.layers) - 40
        print(f"Total layers in MobileNetV2 backbone: {len(base_model.layers)}")
        print(f"Freezing layers up to index {fine_tune_at}, training the remaining top layers.")
        
        for layer in base_model.layers[:fine_tune_at]:
            layer.trainable = False
        for layer in base_model.layers[fine_tune_at:]:
            layer.trainable = True

    # 4. RE-COMPILE MODEL WITH ULTRA-LOW LEARNING RATE
    print("\n[4/5] Re-compiling model with low learning rate schedule (lr=1e-5)...")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    model.summary()

    # Define callbacks for optimal convergence
    early_stop = tf.keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=2,
        restore_best_weights=True
    )
    
    reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.2,
        patience=1,
        min_lr=1e-7
    )

    # 5. RUN FINE-TUNING
    print(f"\n[5/5] Training for {EPOCHS} optimization epochs...")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
        callbacks=[early_stop, reduce_lr]
    )

    # SAVE OPTIMIZED MODEL
    print(f"\nSaving optimized model to: {OPTIMIZED_MODEL_PATH}")
    model.save(OPTIMIZED_MODEL_PATH)
    print("\n🎉 Model fine-tuning completed successfully! Optimized model is ready for AgriVision integration.")

if __name__ == "__main__":
    main()
