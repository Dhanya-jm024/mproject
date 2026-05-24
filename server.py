import os
import sqlite3
import datetime
import io
import hashlib
import numpy as np
import pandas as pd
from PIL import Image
from flask import Flask, request, jsonify, send_file, send_from_directory
from fpdf import FPDF

# Dynamic Library Imports with Self-Healing Auto-Installation
try:
    import tensorflow as tf
except ImportError:
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "tensorflow"])
    import tensorflow as tf

try:
    import google.generativeai as genai
except ImportError:
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "google-generativeai"])
    import google.generativeai as genai

app = Flask(__name__, static_folder='static')

# -----------------------------------------------------------------------------
# DATABASE OPERATIONS (SQLite Integration)
# -----------------------------------------------------------------------------
DB_PATH = "agrivision.db"

def init_db():
    """Initialize SQLite database for diagnostic scan logging and user authentication."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Scans log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            class_label TEXT,
            confidence REAL,
            severity TEXT,
            status TEXT,
            filename TEXT
        )
    """)
    
    # Users credential table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            email TEXT,
            created_at TEXT
        )
    """)
    
    # Self-healing: Add full_name column to users safely
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN full_name TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass
    
    # Self-healing schemas alteration: Add user_id column to scans safely
    try:
        cursor.execute("ALTER TABLE scans ADD COLUMN user_id INTEGER DEFAULT NULL")
    except sqlite3.OperationalError:
        # Column already exists
        pass
        
    conn.commit()
    conn.close()

def log_scan(class_label, confidence, severity, filename="uploaded_image.png", user_id=None):
    """Insert diagnostic scan results into the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO scans (timestamp, class_label, confidence, severity, status, filename, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (now_str, class_label, confidence, severity, "Active Infestation" if class_label != "Healthy" else "Healthy", filename, user_id))
    conn.commit()
    conn.close()

def get_scan_history(user_id=None):
    """Retrieve diagnostic scan logs context-filtered by user session."""
    conn = sqlite3.connect(DB_PATH)
    if user_id is not None:
        df = pd.read_sql_query("SELECT * FROM scans WHERE user_id = ? ORDER BY timestamp DESC", conn, params=(user_id,))
    else:
        df = pd.read_sql_query("SELECT * FROM scans WHERE user_id IS NULL ORDER BY timestamp DESC", conn)
    conn.close()
    return df.to_dict(orient='records')

def update_scan_status(record_id, new_status):
    """Toggle recovery/treatment status of a crop record."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE scans SET status = ? WHERE id = ?", (new_status, record_id))
    conn.commit()
    conn.close()

def delete_scan_record(record_id):
    """Delete a diagnostic record from the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM scans WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()

# Initialize DB on startup
init_db()

# -----------------------------------------------------------------------------
# MODEL LOADING & IMAGE PREPROCESSING
# -----------------------------------------------------------------------------
CLASS_NAMES = [
    "Bacterial_Spot",
    "Cercospora_leaf_mold",
    "Early_Blight",
    "Healthy",
    "Insect_Damage",
    "Late_Blight",
    "Leaf_Miner",
    "Leaf_Mold",
    "Spider_Mites",
    "Tomato_Leaf_Curl_Virus"
]

# Load optimized high-precision tomato model or fallbacks
def load_tomato_model():
    opt_path = "/Users/jmdhanyakumar/Desktop/MPROJECT/models/tomato_disease_model_optimized.keras"
    keras_path = "/Users/jmdhanyakumar/Desktop/MPROJECT/models/tomato_disease_model.keras"
    h5_path = "/Users/jmdhanyakumar/Desktop/MPROJECT/models/tomato_disease_model.h5"
    
    if os.path.exists(opt_path):
        try:
            model = tf.keras.models.load_model(opt_path)
            return model, "✨ Optimized Fine-Tuned Model loaded (tomato_disease_model_optimized.keras)"
        except Exception as e:
            print(f"Error loading optimized model: {e}")
            
    if os.path.exists(keras_path):
        try:
            model = tf.keras.models.load_model(keras_path)
            return model, "MobileNetV2 Model (.keras) loaded successfully."
        except Exception as e:
            print(f"Error loading .keras model: {e}")
            
    if os.path.exists(h5_path):
        try:
            model = tf.keras.models.load_model(h5_path)
            return model, "Legacy H5 Model (.h5) loaded successfully."
        except Exception as e:
            print(f"Error loading .h5 model: {e}")
            
    return None, "No trained model found! Please check models/ folder."

model, model_msg = load_tomato_model()
print(f"Diagnostics Backend: {model_msg}")

def preprocess_image(pil_image):
    """Preprocess PIL Image for MobileNetV2 input."""
    img_resized = pil_image.resize((224, 224))
    img_array = tf.keras.preprocessing.image.img_to_array(img_resized)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

# -----------------------------------------------------------------------------
# AGRICULTURAL TREATMENT DATABASE
# -----------------------------------------------------------------------------
AGRI_DATABASE = {
    "Bacterial_Spot": {
        "symptoms": "Dark, water-soaked, circular spots on leaves that eventually turn brown or black. The surrounding margins may become yellow (chlorotic halos). Leaves may drop prematurely in severe cases.",
        "precautions": [
            "Use certified pathogen-free, high-quality tomato seeds and transplants.",
            "Avoid overhead irrigation; instead, use drip or furrow systems to keep leaves dry.",
            "Implement a 3-year crop rotation schedule with non-solanaceous crops.",
            "Decontaminate tools, supports, and stakes regularly."
        ],
        "organic": "Apply copper-based organic sprays or formulations containing Bacillus subtilis (e.g., Serenade) early in the morning when plants are dry.",
        "chemical": "If severe, apply sprays containing copper hydroxide mixed with Mancozeb. Streptomycin applications can be used in nurseries under strict guidelines."
    },
    "Cercospora_leaf_mold": {
        "symptoms": "Light green or yellow spots on the upper leaf surface, with a matching gray, velvety mold patch forming on the lower leaf surface, leading to leaf curling and defoliation.",
        "precautions": [
            "Maintain wide spacing between tomato plants to ensure proper aeration.",
            "Prune lower leaves to improve airflow and reduce soil splash-back.",
            "Prune and safely destroy infected leaves to reduce spore spread.",
            "Avoid planting crops in poorly ventilated, high-humidity greenhouses."
        ],
        "organic": "Spray leaf surfaces with high-quality Neem oil, or spray bio-fungicides based on biological antagonists like Trichoderma harzianum.",
        "chemical": "Use fungicides containing Chlorothalonil, Difenoconazole, or Azoxystrobin to protect leaf surfaces from spore germination."
    },
    "Early_Blight": {
        "symptoms": "Dark brown, circular spots with concentric rings resembling a bullseye or target pattern, usually starting on older, lower leaves. Leaves yellow and die off.",
        "precautions": [
            "Mulch the soil around plants heavily to prevent soil-borne spores from splashing onto lower leaves.",
            "Prune away branches up to 12 inches from the ground.",
            "Ensure crops are rotated with non-host families annually.",
            "Irrigate at the base of plants early in the morning."
        ],
        "organic": "Apply copper octanoate sprays, or use compost tea foliage washes to establish competitive non-pathogenic microflora on leaf surfaces.",
        "chemical": "Preventative spraying of Chlorothalonil or protectant fungicides like Mancozeb can control early season infestations."
    },
    "Healthy": {
        "symptoms": "Vibrant, green, uniform, and turgid leaves. Strong vascular structures with no visual evidence of spotting, leaf curling, feeding scars, or velvet mold.",
        "precautions": [
            "Maintain optimal irrigation schedules based on soil moisture.",
            "Provide balanced organic fertilization (Nitrogen, Phosphorus, Potassium).",
            "Monitor plant health twice a week for early diagnosis.",
            "Keep the garden free from weeds that host disease vectors."
        ],
        "organic": "Maintain healthy organic soil biology through compost additions. Keep beneficial insects (ladybugs, hoverflies) nearby.",
        "chemical": "No chemical fungicides or insecticides are required. Avoid preventative chemical spraying to maintain leaf health."
    },
    "Insect_Damage": {
        "symptoms": "Leaves displaying chewing damage, skeletonized tissues (only veins remaining), large holes, or folded leaves with silk webbing. Pests like loopers, hornworms, or beetles may be visible.",
        "precautions": [
            "Deploy insect exclusion netting or row covers early in the crop cycle.",
            "Manually hand-pick large pests like hornworms and drop them in soapy water.",
            "Eliminate weeds around the garden perimeter that act as host environments.",
            "Utilize companion plants (marigolds, basil) to repel pests naturally."
        ],
        "organic": "Spray formulations containing Bacillus thuringiensis (Bt) which specifically target caterpillars, or apply Spinosad and horticultural soaps.",
        "chemical": "For severe chewing pest outbreaks, apply targeted insecticides containing Pyrethroids or Esfenvalerate, ensuring strict compliance with pre-harvest intervals."
    },
    "Late_Blight": {
        "symptoms": "Large, irregular, water-soaked dark gray/green lesions on leaves and stems. Lesions turn purplish-black and a delicate white fungal growth appears on the leaf underside under moist conditions.",
        "precautions": [
            "Immediately destroy all potato/tomato volunteer plants that may host the oomycete.",
            "Promptly pull out, bag, and destroy highly infected plants; do not compost them.",
            "Select resistant varieties (e.g., Mountain Magic, Defiant).",
            "Keep greenhouse relative humidity low and avoid dew point environments."
        ],
        "organic": "Apply preventative copper soaps or bio-fungicides based on Bacillus amyloliquefaciens (e.g., Cease) to boost plant systemic resistance.",
        "chemical": "Apply systemic protectant fungicides like Metalaxyl-M, Chlorothalonil, or Fluopicolide immediately upon local disease alerts."
    },
    "Leaf_Miner": {
        "symptoms": "Distinct white, yellow, or translucent serpentine winding tunnels ('mines') within the leaf structure, created by larvae feeding on mesophyll tissue between epidermal layers.",
        "precautions": [
            "Hang yellow sticky cards above the foliage canopy to capture adult flies.",
            "Prune and destroy leaves with active mining tunnels (where larvae are visible).",
            "Squeeze the ends of mines to kill active larvae manually without leaf removal.",
            "Protect natural leaf miner parasitoids by avoiding broad-spectrum pesticides."
        ],
        "organic": "Use Neem oil sprays to deter egg-laying, or introduce natural predators like parasitic wasps (Diglyphus isaea). Apply Spinosad as an organic curative.",
        "chemical": "If infestation crosses economic thresholds, apply Abamectin or Cyromazine, which penetrate leaf tissues to reach feeding larvae."
    },
    "Leaf_Mold": {
        "symptoms": "Pale green or yellow spots on the upper leaf surface, corresponding to olive-green to brown velvety patches of mold on the lower leaf surface, resulting in complete leaf death.",
        "precautions": [
            "Ensure greenhouse relative humidity is maintained below 85% with fans and venting.",
            "Plant leaf mold-resistant tomato cultivars.",
            "Keep plants well pruned and spaced to enhance light and wind penetration.",
            "Adopt low-level drip irrigation rather than overhead watering."
        ],
        "organic": "Dust leaves with fine wettable sulfur, or spray biological suppressants containing Bacillus subtilis to prevent spore germination.",
        "chemical": "Apply preventative or systemic fungicides containing Azoxystrobin, Chlorothalonil, or Difenoconazole during favorable high-humidity periods."
    },
    "Spider_Mites": {
        "symptoms": "Fine webbing visible on the undersides of leaves and stems. Leaves show fine yellow or white stippling (dots) on the upper surface, progressing to bronze, brittle, dry leaves.",
        "precautions": [
            "Keep plants well-watered; drought-stressed plants are highly susceptible to mites.",
            "Routinely hose down tomato foliage with sharp water jets to break webs and dislodge mites.",
            "Control dust in agricultural pathways, as dust promotes spider mite outbreaks.",
            "Preserve native predator insect populations by avoiding toxic chemicals."
        ],
        "organic": "Apply premium insecticidal soaps, horticultural oils, or release predatory mites (Phytoseiulus persimilis) which feed aggressively on spider mites.",
        "chemical": "Apply specialized miticides containing Abamectin, Bifenazate, or Spiromesifen to control both adult mites and eggs."
    },
    "Tomato_Leaf_Curl_Virus": {
        "symptoms": "Severe upward leaf curling, crinkling, and reduction in leaf size. Leaves show bright yellowing along margins and interveinal areas. Plant growth is severely stunted and dwarfed.",
        "precautions": [
            "Strictly control the primary vector: silverleaf whitefly (Bemisia tabaci).",
            "Install reflective silver mulches to disorient whiteflies and prevent landing.",
            "Rogue out and destroy infected viral plants immediately to prevent field spread.",
            "Utilize physical insect barriers (mesh netting) inside seedling nurseries."
        ],
        "organic": "Spray leaves weekly with Neem oil or insecticidal soap to reduce whitefly vectors. Encourage natural whitefly predators like lacewings.",
        "chemical": "Apply systemic vector-control insecticides containing Imidacloprid, Acetamiprid, or Dinotefuran early in the season to prevent viral transmission."
    }
}

# -----------------------------------------------------------------------------
# PDF REPORT EXPORTER (FPDF2 Generator)
# -----------------------------------------------------------------------------
def generate_pdf_bytes(label, conf, sev, info):
    """Compile diagnostic data into a professional styled PDF report using fpdf2."""
    pdf = FPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Page borders/margin setup
    pdf.set_margins(15, 15, 15)
    
    # Title Banner with Dark Emerald Green Background
    pdf.set_fill_color(13, 30, 21) # #0d1e15 - Matches theme
    pdf.rect(10, 10, 190, 25, "F")
    
    pdf.set_y(15)
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(46, 204, 113) # Emerald Accent #2ecc71
    pdf.cell(0, 8, "AGRIVISION CROP HEALTH PRESCRIPTION", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "I", 9)
    pdf.set_text_color(226, 244, 234) # Light Text #e2f4ea
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pdf.cell(0, 5, f"Automated Field Diagnostic Report | Generated: {now_str}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)
    
    # Section 1: Diagnostic Summary
    pdf.set_y(45)
    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(46, 204, 113)
    pdf.cell(0, 8, "1. DIAGNOSTIC SUMMARY", new_x="LMARGIN", new_y="NEXT")
    
    # Set thin separator line
    pdf.set_draw_color(26, 60, 43)
    pdf.set_line_width(0.5)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(4)
    
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(50, 50, 50)
    
    # Info list
    pdf.cell(60, 6, "Class Classified:")
    pdf.set_font("helvetica", "B", 10)
    if label != "Healthy":
        pdf.set_text_color(192, 57, 43)
    else:
        pdf.set_text_color(39, 174, 96)
    pdf.cell(0, 6, label.replace('_', ' '), new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(60, 6, "AI Classification Confidence:")
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(0, 6, f"{conf:.2f}%", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "", 10)
    pdf.cell(60, 6, "Infection Severity Assessment:")
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(0, 6, sev, new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "", 10)
    pdf.cell(60, 6, "Diagnostic Scan Record Status:")
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(0, 6, "Active Infestation" if label != "Healthy" else "Healthy", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)
    
    # Section 2: Leaf Symptoms
    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(46, 204, 113)
    pdf.cell(0, 8, "2. IDENTIFIED LEAF SYMPTOMS", new_x="LMARGIN", new_y="NEXT")
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(4)
    
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 5, info['symptoms'])
    pdf.ln(6)
    
    # Section 3: Preventive Measures
    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(46, 204, 113)
    pdf.cell(0, 8, "3. PREVENTIVE & PRECAUTIONARY MEASURES", new_x="LMARGIN", new_y="NEXT")
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(4)
    
    pdf.set_font("helvetica", "", 10)
    for i, step in enumerate(info["precautions"], 1):
        pdf.multi_cell(0, 5, f"{i}. {step}")
    pdf.ln(6)
    
    # Section 4: Treatment Guidelines
    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(46, 204, 113)
    pdf.cell(0, 8, "4. TARGETED CROP REMEDIATION GUIDELINES", new_x="LMARGIN", new_y="NEXT")
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(4)
    
    # Organic Box
    pdf.set_font("helvetica", "B", 10.5)
    pdf.set_text_color(39, 174, 96) # Green
    pdf.cell(0, 6, "🌿 Organic & Biological Remediation Action Plan", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 5, info['organic'])
    pdf.ln(4)
    
    # Chemical Box
    pdf.set_font("helvetica", "B", 10.5)
    pdf.set_text_color(192, 57, 43) # Red
    pdf.cell(0, 6, "🧪 Targeted Chemical Remediation Action Plan", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 5, info['chemical'])
    
    # Footer notes
    pdf.ln(12)
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(0, 4, "Note: This diagnostic prescription has been synthesized using deep learning neural networks trained on public tomato leaf datasets combined with integrated pest management (IPM) guidelines. Always consult with local extension offices and read chemical labels prior to application.", align="C")
    
    return bytes(pdf.output())

# -----------------------------------------------------------------------------
# API ROUTING & REQUEST HANDLERS
# -----------------------------------------------------------------------------
@app.route('/')
def index():
    """Serve the single page static dashboard index.html."""
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static directory CSS/JS/Image files."""
    return send_from_directory('static', path)

@app.route('/api/predict', methods=['POST'])
def api_predict():
    """Endpoint for crop leaf or general pest diagnostic scan predictions."""
    if model is None:
        return jsonify({"error": "No trained deep learning model loaded on server backend."}), 500
        
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded in form data."}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Selected file is empty."}), 400
        
    try:
        # Extract optional user session locking ID
        user_id = request.form.get('user_id')
        if user_id and user_id != 'null':
            user_id = int(user_id)
        else:
            user_id = None

        # Extract diagnostic mode and optional api key
        mode = request.form.get('mode', 'local')
        api_key = request.form.get('api_key', '')

        # Read file bytes once to save and process
        img_bytes = file.read()
        
        # Save image securely in a static uploads folder
        import uuid
        import json
        ext = os.path.splitext(file.filename)[1] or ".png"
        now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"scan_{now_str}_{uuid.uuid4().hex[:8]}{ext}"
        
        UPLOAD_FOLDER = os.path.join('static', 'uploads')
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        save_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        with open(save_path, 'wb') as f:
            f.write(img_bytes)

        # Open image for processing
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        
        if mode == 'gemini':
            # Run Advanced Multi-Modal AI Scan via Gemini
            api_key_to_use = api_key if api_key else os.environ.get("GEMINI_API_KEY", "")
            if not api_key_to_use:
                return jsonify({"error": "🔑 Please supply a Gemini API Key in the left sidebar configuration to run an Advanced AI Scan."}), 400
                
            try:
                genai.configure(api_key=api_key_to_use)
                gemini_model = genai.GenerativeModel("gemini-2.5-flash")
                
                prompt = """
                Analyze this agricultural image. Identify if there is a plant pest infestation, a crop disease, or if the plant is healthy.
                Provide your response in raw JSON format with NO markdown code block wrappers (do not include ```json or ```). It must be parsed directly as standard JSON by Python's json.loads.
                
                The JSON must contain exactly these keys:
                1. "class_label": A short, clear name of the diagnosed pest, insect, or plant disease (e.g., "Aphids", "Spider Mites", "Leaf Miner", "Tomato Leaf Curl Virus", "Early Blight", or "Healthy"). Keep it concise.
                2. "confidence": A float representing your diagnostic confidence percentage between 0.0 and 100.0.
                3. "severity": One of the values: "None", "Low", "Medium", or "High".
                4. "symptoms": A detailed clinical description of the symptoms, leaf spots, feeding tunnels, or physical pests observed in the image.
                5. "precautions": A list of 3-4 physical or preventative measures to stop the outbreak. Each precaution must be a string in a JSON array.
                6. "organic": A description of organic treatments, biological pest controllers, or neem-oil based remedies.
                7. "chemical": A description of targeted chemical controls, insecticides, or fungicides.
                """
                
                response = gemini_model.generate_content(
                    [pil_img, prompt],
                    generation_config={"response_mime_type": "application/json"}
                )
                
                try:
                    res_data = json.loads(response.text)
                except Exception:
                    clean_text = response.text.replace("```json", "").replace("```", "").strip()
                    res_data = json.loads(clean_text)
                    
                class_label = res_data.get("class_label", "Unknown Pathology")
                confidence = float(res_data.get("confidence", 85.0))
                severity = res_data.get("severity", "Medium")
                symptoms = res_data.get("symptoms", "Advanced symptoms observed in image scan.")
                precautions = res_data.get("precautions", ["Isolate plant", "Apply remediation"])
                organic = res_data.get("organic", "Apply organic neem oil formulations.")
                chemical = res_data.get("chemical", "Consult local chemical guides.")
                
            except Exception as gemini_err:
                return jsonify({"error": f"Generative AI scan failed: {str(gemini_err)}"}), 500
        else:
            # Run Local MobileNetV2 Scan
            processed_img = preprocess_image(pil_img)
            
            # Keras Inference
            preds = model.predict(processed_img)[0]
            top_idx = np.argmax(preds)
            class_label = CLASS_NAMES[top_idx]
            confidence = float(preds[top_idx] * 100)
            
            # Severity Assessment
            severity = "Medium"
            if class_label == "Healthy":
                severity = "None"
            elif confidence > 90.0:
                severity = "High"
            elif confidence < 65.0:
                severity = "Low"
                
            # Retrieve remedies
            remedies = AGRI_DATABASE[class_label]
            symptoms = remedies["symptoms"]
            precautions = remedies["precautions"]
            organic = remedies["organic"]
            chemical = remedies["chemical"]
            
        # Log to Database safely locked to user if authenticated
        log_scan(class_label, confidence, severity, unique_filename, user_id)
        
        return jsonify({
            "class_label": class_label,
            "confidence": confidence,
            "severity": severity,
            "symptoms": symptoms,
            "precautions": precautions,
            "organic": organic,
            "chemical": chemical,
            "filename": unique_filename
        })
    except Exception as e:
        return jsonify({"error": f"Failed executing neural inference: {str(e)}"}), 500

@app.route('/api/history', methods=['GET'])
def api_history():
    """Retrieve database history logs context-filtered by user session."""
    user_id = request.args.get('user_id')
    if user_id and user_id != 'null':
        user_id = int(user_id)
    else:
        user_id = None
        
    try:
        history = get_scan_history(user_id)
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": f"Database query failure: {str(e)}"}), 500

@app.route('/api/history/update', methods=['POST'])
def api_history_update():
    """Toggle cure/recovered state in database logs."""
    data = request.json
    if not data or 'id' not in data or 'status' not in data:
        return jsonify({"error": "Missing payload fields 'id' or 'status'."}), 400
        
    try:
        update_scan_status(int(data['id']), data['status'])
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": f"Failed updating database log: {str(e)}"}), 500

@app.route('/api/history/delete', methods=['POST'])
def api_history_delete():
    """Delete a scan record from database logs."""
    data = request.json
    if not data or 'id' not in data:
        return jsonify({"error": "Missing payload field 'id'."}), 400
        
    try:
        delete_scan_record(int(data['id']))
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": f"Failed deleting record: {str(e)}"}), 500

@app.route('/api/auth/register', methods=['POST'])
def api_auth_register():
    """Register a new user inside the SQLite database."""
    data = request.json
    if not data or 'username' not in data or 'password' not in data or 'email' not in data:
        return jsonify({"error": "Missing registration credentials."}), 400
        
    username = data['username'].strip()
    password = data['password']
    email = data['email'].strip()
    full_name = data.get('full_name', '').strip()
    
    if not username or not password or not email:
        return jsonify({"error": "Fields cannot be blank."}), 400
    
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    
    if '@' not in email or '.' not in email:
        return jsonify({"error": "Please enter a valid email address."}), 400
        
    # Hash the password with SHA-256
    hashed_pw = hashlib.sha256(password.encode('utf-8')).hexdigest()
        
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if username exists
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"error": "Username is already registered."}), 400
        
        # Check if email exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"error": "Email is already registered."}), 400
            
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO users (username, password, email, full_name, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (username, hashed_pw, email, full_name, now_str))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "user": {
                "id": user_id,
                "username": username,
                "email": email,
                "full_name": full_name
            }
        })
    except Exception as e:
        return jsonify({"error": f"Failed database user creation: {str(e)}"}), 500

@app.route('/api/auth/login', methods=['POST'])
def api_auth_login():
    """Authenticate and retrieve user profile details."""
    data = request.json
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"error": "Missing login credentials."}), 400
        
    username = data['username'].strip()
    password = data['password']
    
    # Hash the password with SHA-256
    hashed_pw = hashlib.sha256(password.encode('utf-8')).hexdigest()
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Try hashed password first
        cursor.execute("SELECT id, username, email, full_name FROM users WHERE username = ? AND password = ?", (username, hashed_pw))
        row = cursor.fetchone()
        
        if not row:
            # Fallback: try plaintext password (auto-migrate legacy accounts)
            cursor.execute("SELECT id, username, email, full_name, password FROM users WHERE username = ?", (username,))
            legacy_row = cursor.fetchone()
            if legacy_row and legacy_row[4] == password:
                # Migrate plaintext password to hash
                cursor.execute("UPDATE users SET password = ? WHERE id = ?", (hashed_pw, legacy_row[0]))
                conn.commit()
                row = legacy_row[:4]
        
        conn.close()
        
        if row:
            return jsonify({
                "success": True,
                "user": {
                    "id": row[0],
                    "username": row[1],
                    "email": row[2],
                    "full_name": row[3] or row[1]
                }
            })
        else:
            return jsonify({"error": "Invalid username or password."}), 401
    except Exception as e:
        return jsonify({"error": f"Failed checking user database: {str(e)}"}), 500

@app.route('/api/chat', methods=['POST'])
def api_chat():
    """Conversational agronomist assistant connection utilizing standard Gemini model."""
    data = request.json
    if not data or 'message' not in data:
        return jsonify({"error": "Prompt message payload is empty."}), 400
        
    user_prompt = data['message']
    active_diag = data.get('active_diagnosis', '')
    active_conf = data.get('active_confidence', 0.0)
    api_key = data.get('api_key', '')
    
    # Configure Gemini API Key
    api_key_to_use = api_key if api_key else os.environ.get("GEMINI_API_KEY", "")
    if not api_key_to_use:
        return jsonify({"reply": "🔑 Chatbot is in offline demo mode. Please supply a Gemini API Key in the left sidebar configuration to start a live analysis."})
        
    try:
        genai.configure(api_key=api_key_to_use)
        
        # Enriched Context Prompting
        sys_context = "You are a professional agricultural scientist and local agronomist expert helping farmers treat tomato plants."
        if active_diag:
            sys_context += f" The current tomato crop being inspected has been diagnosed with '{active_diag.replace('_', ' ')}' with an AI confidence of {active_conf:.1f}%. Tailor your response contextually to help remediate this specific disease/pest."
            
        full_prompt = f"System Context: {sys_context}\n\nUser Question: {user_prompt}"
        
        # Standard Gemini API Call
        gemini_model = genai.GenerativeModel("gemini-2.5-flash")
        response = gemini_model.generate_content(full_prompt)
        return jsonify({"reply": response.text})
    except Exception as e:
        return jsonify({"reply": f"🤖 Connection error: {str(e)}"}), 500

@app.route('/api/export-pdf', methods=['POST'])
def api_export_pdf():
    """Generates FPDF2 compiled PDF and streams it as a browser attachment."""
    data = request.json
    if not data or 'class_label' not in data or 'confidence' not in data or 'severity' not in data:
        return jsonify({"error": "Payload missing parameters."}), 400
        
    label = data['class_label']
    conf = float(data['confidence'])
    sev = data['severity']
    
    if label not in AGRI_DATABASE:
        return jsonify({"error": "Unknown crop label classification."}), 400
        
    info = AGRI_DATABASE[label]
    
    try:
        pdf_bytes = generate_pdf_bytes(label, conf, sev, info)
        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"crop_prescription_{label.lower()}.pdf"
        )
    except Exception as e:
        return jsonify({"error": f"Failed generating PDF: {str(e)}"}), 500

if __name__ == "__main__":

    PORT = int(os.environ.get("PORT", 5001))

    try:
        init_db()
        print("Database initialized")
    except Exception as e:
        print(f"Database error: {e}")

    app.run(
        host="0.0.0.0",
        port=PORT,
        debug=True
    )
