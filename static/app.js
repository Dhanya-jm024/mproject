// =============================================================================
// 1. GLOBAL STATE & APPLICATION INITIALIZATION
// =============================================================================
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://mproject-backend.onrender.com'; // Replace with your Render URL once deployed

let currentUser = JSON.parse(localStorage.getItem('agrivision_user')) || null;
let currencyState = {
    current: 'USD',
    rate: 1.0,
    symbol: '$'
};
const CURRENCY_RATES = {
    USD: { rate: 1.0, symbol: '$' },
    INR: { rate: 83.0, symbol: '₹' },
    EUR: { rate: 0.92, symbol: '€' },
    GBP: { rate: 0.79, symbol: '£' }
};

const state = {
    activeTab: 'tab-diagnose',
    geminiKey: localStorage.getItem('gemini_api_key') || 'AIzaSyAGJ4PvPoZgS2FNEHXl25WhnMvHvy-_KSM',
    activeDiagnosis: null,
    activeConfidence: null,
    selectedFile: null,
    stream: null,
    historyData: [],
    leafletMap: null,
    forecastingChart: null,
    convergenceChart: null,
    lastPrescriptionData: null,
    hasBackendKey: false,
    
    // E-Commerce Cart State
    cart: JSON.parse(localStorage.getItem('agrivision_cart')) || []
};

// Amazon-Themed Remedies Database
const PRODUCTS_CATALOG = [
    {
        id: "neem-oil",
        title: "Organic Neem Oil Concentrate (16 oz)",
        desc: "Certified organic cold-pressed neem extract. 3-in-1 insecticide, miticide, and fungicide. Exterminates spider mites and leaf curl vectors naturally.",
        price: 14.99,
        originalPrice: 19.99,
        rating: 4.8,
        reviews: 312,
        image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=300&auto=format&fit=crop",
        badge: "Best Seller",
        badgeClass: "badge-amazon",
        categories: ["organic", "pest", "fungal"],
        diseaseLinks: ["Spider_Mites", "Tomato_Leaf_Curl_Virus", "Cercospora_leaf_mold"],
        externalUrl: "https://www.amazon.com/s?k=organic+neem+oil+concentrate&s=price-asc-rank"
    },
    {
        id: "bt-dust",
        title: "Bacillus thuringiensis (Bt) Crop Dust (1 lb)",
        desc: "High-potency organic larvicidal powder targeting hornworms, loopers, and chewing insect pests. Safe for crop foliage and beneficial insects.",
        price: 11.99,
        originalPrice: 15.49,
        rating: 4.9,
        reviews: 185,
        image: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?q=80&w=300&auto=format&fit=crop",
        badge: "Organic Choice",
        badgeClass: "badge-amazon",
        categories: ["organic", "pest"],
        diseaseLinks: ["Insect_Damage"],
        externalUrl: "https://www.amazon.com/s?k=bacillus+thuringiensis+dust&s=price-asc-rank"
    },
    {
        id: "copper-fungicide",
        title: "Liquid Copper Hydroxide Spray (32 oz)",
        desc: "Broad-spectrum copper protectant spray. Halts bacterial spots, early season mildews, and early blight lesions on contact.",
        price: 18.99,
        originalPrice: 22.99,
        rating: 4.7,
        reviews: 245,
        image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?q=80&w=300&auto=format&fit=crop",
        badge: "Amazon's Choice",
        badgeClass: "badge-amazon",
        categories: ["chemical", "fungal"],
        diseaseLinks: ["Bacterial_Spot", "Early_Blight"],
        externalUrl: "https://www.amazon.com/s?k=liquid+copper+fungicide+for+plants&s=price-asc-rank"
    },
    {
        id: "chlorothalonil",
        title: "Chlorothalonil High-Potency Fungicide",
        desc: "Max-strength preventative protectant. Ideal to halt aggressive late blight spore spread and early leaf mold lesions.",
        price: 22.99,
        originalPrice: 27.99,
        rating: 4.6,
        reviews: 198,
        image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?q=80&w=300&auto=format&fit=crop",
        badge: "Top Rated",
        badgeClass: "badge-amazon",
        categories: ["chemical", "fungal"],
        diseaseLinks: ["Late_Blight", "Leaf_Mold"],
        externalUrl: "https://www.amazon.com/s?k=chlorothalonil+fungicide&s=price-asc-rank"
    },
    {
        id: "spinosad",
        title: "Spinosad Organic Leaf-Miner Control",
        desc: "Naturally derived bacterial metabolite spray. Penetrates leaf layers to stop chewing larvae and active leaf miners inside tunnels.",
        price: 19.99,
        originalPrice: 24.99,
        rating: 4.8,
        reviews: 167,
        image: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?q=80&w=300&auto=format&fit=crop",
        badge: "Highly Effective",
        badgeClass: "badge-amazon",
        categories: ["organic", "pest"],
        diseaseLinks: ["Leaf_Miner", "Insect_Damage"],
        externalUrl: "https://www.amazon.com/s?k=spinosad+organic+insect+control&s=price-asc-rank"
    },
    {
        id: "serenade",
        title: "Serenade Organic Biofungicide (32 oz)",
        desc: "Bacillus subtilis biological organic defense spray. Promotes natural tomato immunity against bacterial specks and spots.",
        price: 24.99,
        originalPrice: 29.99,
        rating: 4.7,
        reviews: 220,
        image: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?q=80&w=300&auto=format&fit=crop",
        badge: "Organic Certified",
        badgeClass: "badge-amazon",
        categories: ["organic", "fungal"],
        diseaseLinks: ["Bacterial_Spot"],
        externalUrl: "https://www.amazon.com/s?k=serenade+biofungicide&s=price-asc-rank"
    },
    {
        id: "difenoconazole",
        title: "Difenoconazole Systemic Fungicide (16 oz)",
        desc: "Translaminar chemical fungicide. Absorbs into foliage stems to clear deep cercospora molds and early blight lesions.",
        price: 29.99,
        originalPrice: 34.99,
        rating: 4.5,
        reviews: 134,
        image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=300&auto=format&fit=crop",
        badge: "Commercial Grade",
        badgeClass: "badge-amazon",
        categories: ["chemical", "fungal"],
        diseaseLinks: ["Cercospora_leaf_mold", "Leaf_Mold"],
        externalUrl: "https://www.amazon.com/s?k=difenoconazole+fungicide&s=price-asc-rank"
    },
    {
        id: "sticky-traps",
        title: "Yellow Sticky Insect Fly Traps (20 Pack)",
        desc: "Double-sided yellow sticky capture traps. Invaluable to attract, capture, and monitor whitefly vector populations.",
        price: 8.99,
        originalPrice: 11.99,
        rating: 4.8,
        reviews: 450,
        image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=300&auto=format&fit=crop",
        badge: "Farmers Choice",
        badgeClass: "badge-amazon",
        categories: ["organic", "pest"],
        diseaseLinks: ["Tomato_Leaf_Curl_Virus", "Leaf_Miner"],
        externalUrl: "https://www.amazon.com/s?k=yellow+sticky+insect+traps&s=price-asc-rank"
    },
    {
        id: "miticide",
        title: "Bifenazate Professional Miticide (8 oz)",
        desc: "Highly targeted chemical miticide concentrate. Knocks out active spider mites and provides long-lasting egg control.",
        price: 39.99,
        originalPrice: 47.99,
        rating: 4.9,
        reviews: 92,
        image: "https://images.unsplash.com/photo-1584036561566-baf241f2c44e?q=80&w=300&auto=format&fit=crop",
        badge: "Best Seller",
        badgeClass: "badge-amazon",
        categories: ["chemical", "pest"],
        diseaseLinks: ["Spider_Mites"],
        externalUrl: "https://www.amazon.com/s?k=bifenazate+miticide&s=price-asc-rank"
    },
    {
        id: "fertilizer",
        title: "Balanced Organic Tomato Food Fertilizer (4 lb)",
        desc: "Slow-release organic nutrient granules. High potassium and calcium to bolster stem vigor and prevent calcium deficiencies.",
        price: 12.99,
        originalPrice: 16.99,
        rating: 4.9,
        reviews: 580,
        image: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?q=80&w=300&auto=format&fit=crop",
        badge: "A+ Quality",
        badgeClass: "badge-amazon",
        categories: ["organic", "healthy"],
        diseaseLinks: ["Healthy"],
        externalUrl: "https://www.amazon.com/s?k=organic+tomato+fertilizer&s=price-asc-rank"
    }
];

// Papers database definition
const PAPERS_DATABASE = [
    {
        title: "Development of Convolutional Neural Network CNN Method for Classification of Tomato Leaf Disease Based on Android",
        impact: "Informed the requirement of mobile-friendly and highly responsive layout, enabling field diagnostics through standard browsers on handheld tablets and mobile screens.",
        technique: "Transfer learning utilizing MobileNetV2 due to its lightweight architectural parameters, making it suitable for edge-inference and real-time field deployments."
    },
    {
        title: "Tomato Leaf Disease Detection with Precaution Using EfficientNet-B3",
        impact: "Inspired the core addition of the Agronomic Prescription Engine that displays concrete, non-placeholder precautionary measures, symptoms, and biological controls rather than raw classification tags.",
        technique: "Multi-class categorization combined with targeted preventive action pipelines for high-accuracy disease diagnosis."
    },
    {
        title: "Monitoring and forecasting for disease and pest in crop based on WebGIS system",
        impact: "Provided the blueprint for the WebGIS Outbreak Hub, which tracks geographical hotspots of local infestations and predicts seasonal outbreaks to help farmers prevent regional disease spreads.",
        technique: "Geospatial database integration mapping localized disease reports against temperature/humidity meteorological trends."
    },
    {
        title: "Towards Resilient Crops: Disease Detection and Pest Control Strategies",
        impact: "Helped refine the agricultural treatment database by establishing clear dividing lines between Organic/Biological control (e.g., predatory insects, Bacillus thuringiensis) and Chemical treatment (e.g., Metalaxyl, Chlorothalonil).",
        technique: "Synthesized biological, physical, and chemical integrated pest management (IPM) techniques."
    },
    {
        title: "AIML-based Pest Detection using Hyperspectral Imaging and Edge Inference in 6G Farms",
        impact: "Highlighted the importance of low-latency local edge inference, supporting fast prediction times on devices without requiring heavy network processing pipelines.",
        technique: "Edge model quantization and high-speed multi-spectral signature classification."
    }
];

// Document Ready Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initKeySetup();
    initTabController();
    initUploadSystem();
    initCameraSystem();
    initChatSystem();
    initLiteratureLibrary();
    
    // Theme, Currency, and Auth systems bootstrap
    initThemeToggle();
    initCurrencySystem();
    initAuthSystem();
    initHamburgerMenu();
    initAdvancedDiagnostics();
    
    // E-Commerce systems bootstrap
    initMarketplaceStore();
    initCartSidebarSystem();
    initCheckoutSystem();
    initHeaderSearchEngine();
    updateCartUI();
    
    // Initial data fetch
    fetchHistory();
    
    // Smooth scroll back to top handler
    const topBtn = document.getElementById('scroll-to-top');
    if (topBtn) {
        topBtn.addEventListener('click', () => {
            document.querySelector('.viewport-main-panel').scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

// Real-time Header Clock
function initClock() {
    const timeEl = document.getElementById('live-time');
    const updateTime = () => {
        const now = new Date();
        timeEl.innerText = now.toLocaleString();
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// =============================================================================
// 2. SIDEBAR KEY BINDING & PERSISTENCE
// =============================================================================
// SIDEBAR KEY BINDING & PERSISTENCE
// =============================================================================
function syncKeyUI() {
    const keyInput = document.getElementById('gemini-key');
    const container = document.getElementById('key-input-container');
    const lockIcon = document.getElementById('key-lock-icon');
    const badge = document.getElementById('key-indicator-badge');
    
    const updateHeaderBadge = (active, label = "Key Active") => {
        if (badge) {
            if (active) {
                badge.classList.add('active');
                badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span class="status-badge-text">${label}</span>`;
            } else {
                badge.classList.remove('active');
                badge.innerHTML = `<i class="fa-solid fa-key"></i> <span class="status-badge-text">Demo Mode</span>`;
            }
        }
    };

    if (keyInput) {
        if (state.geminiKey) {
            keyInput.value = state.geminiKey;
            keyInput.placeholder = "Enter Gemini Key...";
        } else if (state.hasBackendKey) {
            keyInput.value = "";
            keyInput.placeholder = "Server Key Active";
        } else {
            keyInput.value = "";
            keyInput.placeholder = "Enter Gemini Key...";
        }
    }
    
    if (state.geminiKey) {
        if (container) container.classList.add('key-active');
        if (lockIcon) {
            lockIcon.className = "fa-solid fa-unlock-keyhole";
            lockIcon.style.color = "var(--cyber-neon-green)";
        }
        updateHeaderBadge(true, "Key Active");
    } else if (state.hasBackendKey) {
        if (container) container.classList.add('key-active');
        if (lockIcon) {
            lockIcon.className = "fa-solid fa-unlock-keyhole";
            lockIcon.style.color = "var(--cyber-neon-green)";
        }
        updateHeaderBadge(true, "Server Active");
    } else {
        if (container) {
            container.classList.remove('key-active');
            container.classList.remove('key-verifying');
        }
        if (lockIcon) {
            lockIcon.className = "fa-solid fa-lock";
            lockIcon.style.color = "var(--text-grey)";
        }
        updateHeaderBadge(false);
    }
}

function initKeySetup() {
    const keyInput = document.getElementById('gemini-key');
    const saveBtn = document.getElementById('save-key-btn');
    const feedback = document.getElementById('key-feedback');
    const container = document.getElementById('key-input-container');
    const lockIcon = document.getElementById('key-lock-icon');
    
    syncKeyUI();
    if (state.geminiKey && feedback) {
        feedback.innerText = "🔑 Key credentials loaded.";
        feedback.style.color = "var(--cyber-neon-green)";
    }
    
    // Asynchronously check if backend has predefined key
    fetch(BACKEND_URL + '/api/config')
        .then(res => res.json())
        .then(data => {
            if (data.has_backend_key) {
                state.hasBackendKey = true;
                syncKeyUI();
                if (!state.geminiKey && feedback) {
                    feedback.innerText = "🔑 Server API key active behind the scenes.";
                    feedback.style.color = "var(--cyber-neon-green)";
                }
            }
        })
        .catch(err => console.error("Error checking backend API key config:", err));
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const val = keyInput.value.trim();
            
            // Start verification animation
            saveBtn.disabled = true;
            saveBtn.className = "cyber-primary-btn w-100 mt-xs key-applying";
            saveBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying Credentials...`;
            
            if (container) {
                container.classList.remove('key-active');
                container.classList.add('key-verifying');
            }
            if (lockIcon) {
                lockIcon.className = "fa-solid fa-key fa-spin";
                lockIcon.style.color = "var(--cyber-neon-blue)";
            }
            
            setTimeout(() => {
                // End simulated cryptographic check
                saveBtn.disabled = false;
                saveBtn.className = "cyber-primary-btn w-100 mt-xs";
                
                if (container) {
                    container.classList.remove('key-verifying');
                }
                
                state.geminiKey = val;
                localStorage.setItem('gemini_api_key', val);
                
                // Persist key to database behind the scenes if logged in
                if (currentUser) {
                    currentUser.gemini_api_key = val;
                    localStorage.setItem('agrivision_user', JSON.stringify(currentUser));
                    fetch(BACKEND_URL + '/api/user/save-key', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: currentUser.id,
                            gemini_api_key: val
                        })
                    }).catch(err => console.error("Failed persisting key to DB:", err));
                }
                
                syncKeyUI();
                
                if (val) {
                    saveBtn.classList.add('key-authorized');
                    saveBtn.innerHTML = `<i class="fa-solid fa-unlock-keyhole"></i> Key Authorized!`;
                    
                    feedback.innerText = "✨ Biotech Credentials Authorized!";
                    feedback.style.color = "var(--cyber-neon-green)";
                    
                    setTimeout(() => {
                        saveBtn.classList.remove('key-authorized');
                        saveBtn.innerHTML = `<i class="fa-solid fa-key"></i> Apply Key Credentials`;
                    }, 2000);
                } else {
                    saveBtn.innerHTML = `<i class="fa-solid fa-key"></i> Apply Key Credentials`;
                    
                    feedback.innerText = "⚠️ Key removed. Portal active in Demo Mode.";
                    feedback.style.color = "var(--cyber-neon-amber)";
                }
                
                setTimeout(() => {
                    feedback.innerText = "";
                }, 4000);
                
            }, 1000);
        });
    }
}

// =============================================================================
// 3. TAB CONTROLLER & ROUTING (LAZY PLUGINS INITIALIZATION)
// =============================================================================
function initTabController() {
    const tabBtns = document.querySelectorAll('.sub-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPaneId = btn.getAttribute('data-tab');
            switchTab(targetPaneId);
        });
    });
}

function switchTab(paneId) {
    const tabBtns = document.querySelectorAll('.sub-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Toggle active buttons
    tabBtns.forEach(b => {
        if (b.getAttribute('data-tab') === paneId) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
    
    // Toggle active panes
    tabPanes.forEach(pane => {
        if (pane.id === paneId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
    
    state.activeTab = paneId;
    
    // Lazy initializations
    if (paneId === 'tab-webgis') {
        setTimeout(initWebGISMap, 100);
        setTimeout(initForecastingChart, 100);
    } else if (paneId === 'tab-analytics') {
        setTimeout(initConvergenceChart, 100);
    } else if (paneId === 'tab-history') {
        fetchHistory();
    } else if (paneId === 'tab-marketplace') {
        renderProducts('all');
    }
    
    // Scroll viewport panel back to top
    document.querySelector('.viewport-main-panel').scrollTop = 0;
}

// =============================================================================
// 4. AMAZON WIDESCREEN SEARCH ENGINE
// =============================================================================
function initHeaderSearchEngine() {
    const searchInput = document.getElementById('header-search-input');
    const submitBtn = document.getElementById('header-search-submit');
    const categorySelect = document.getElementById('search-category-select');
    
    const executeSearch = () => {
        const query = searchInput.value.toLowerCase().trim();
        const category = categorySelect.value;
        
        // Always route to Marketplace store view
        switchTab('tab-marketplace');
        
        // Reset category filter active highlight in shop
        document.querySelectorAll('.filter-btn-cyber').forEach(btn => {
            if (btn.getAttribute('data-filter') === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Execute products filtering
        renderProducts(category, query);
    };
    
    submitBtn.addEventListener('click', executeSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') executeSearch();
    });
}

// =============================================================================
// 5. IMAGE UPLOADING & DRAG ZONE
// =============================================================================
function initUploadSystem() {
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const clearBtn = document.getElementById('clear-image-btn');
    
    zone.addEventListener('click', () => fileInput.click());
    
    // Drag highlights
    ['dragenter', 'dragover'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
        }, false);
    });
    
    zone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleSelectedImage(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            handleSelectedImage(fileInput.files[0]);
        }
    });
    
    clearBtn.addEventListener('click', () => {
        state.selectedFile = null;
        fileInput.value = '';
        document.getElementById('preview-container').style.display = 'none';
        document.getElementById('image-preview').src = '';
        resetHUD();
    });
}

function handleSelectedImage(file) {
    state.selectedFile = file;
    
    // Show Preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const imgEl = document.getElementById('image-preview');
        imgEl.src = e.target.result;
        document.getElementById('preview-container').style.display = 'block';
    };
    reader.readAsDataURL(file);
    
    // Trigger inference
    executeInference(file);
}

function resetHUD() {
    document.getElementById('hud-placeholder').style.display = 'flex';
    document.getElementById('hud-results').style.display = 'none';
    document.getElementById('hud-loading').style.display = 'none';
}

// =============================================================================
// 6. MEDIA DEVICES CAMERA CAPTURE SYSTEM
// =============================================================================
function initCameraSystem() {
    const toggleUpload = document.getElementById('toggle-upload');
    const toggleCamera = document.getElementById('toggle-camera');
    
    const uploadZone = document.getElementById('upload-zone');
    const cameraZone = document.getElementById('camera-zone');
    const video = document.getElementById('video-stream');
    const snapBtn = document.getElementById('snap-btn');
    
    toggleUpload.addEventListener('click', () => {
        toggleUpload.classList.add('active');
        toggleCamera.classList.remove('active');
        uploadZone.style.display = 'block';
        cameraZone.style.display = 'none';
        stopCamera();
    });
    
    toggleCamera.addEventListener('click', async () => {
        toggleCamera.classList.add('active');
        toggleUpload.classList.remove('active');
        cameraZone.style.display = 'flex';
        uploadZone.style.display = 'none';
        await startCamera();
    });
    
    snapBtn.addEventListener('click', () => {
        if (!video.videoWidth) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            const file = new File([blob], "camera_snapshot.png", { type: "image/png" });
            handleSelectedImage(file);
            toggleUpload.click();
        }, "image/png");
    });
}

async function startCamera() {
    try {
        state.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        const video = document.getElementById('video-stream');
        video.srcObject = state.stream;
    } catch (err) {
        console.error("Camera access failed: ", err);
        alert("Unable to open device camera. Please check browser permissions.");
        document.getElementById('toggle-upload').click();
    }
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
}

// =============================================================================
// 7. DEEP LEARNING INFERENCE AJAX CONTROLLER
// =============================================================================
async function executeInference(file) {
    const placeholder = document.getElementById('hud-placeholder');
    const loading = document.getElementById('hud-loading');
    const results = document.getElementById('hud-results');
    
    // Save as active file for Advanced AI re-triggering fallbacks
    state.activeFile = file;
    
    placeholder.style.display = 'none';
    loading.style.display = 'flex';
    results.style.display = 'none';
    
    // Display scanned preview immediately in HUD results card
    const hudImgContainer = document.getElementById('hud-scanned-preview-box');
    const hudImg = document.getElementById('hud-scanned-preview-img');
    if (hudImgContainer && hudImg) {
        const reader = new FileReader();
        reader.onload = (e) => {
            hudImg.src = e.target.result;
            hudImgContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
    
    // Read active diagnostic mode
    const aiToggle = document.getElementById('ai-mode-toggle');
    const mode = (aiToggle && aiToggle.checked) ? 'gemini' : 'local';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    formData.append('api_key', state.geminiKey || '');
    if (currentUser) {
        formData.append('user_id', currentUser.id);
    }
    
    try {
        const response = await fetch(BACKEND_URL + '/api/predict', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Inference endpoint returned HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update App Diagnosis State
        state.activeDiagnosis = data.class_label;
        state.activeConfidence = data.confidence;
        
        // Update HUD DOM
        document.getElementById('result-label').innerText = data.class_label.replace(/_/g, ' ');
        document.getElementById('result-confidence').innerText = `${data.confidence.toFixed(2)}%`;
        
        const fillBar = document.getElementById('confidence-bar');
        fillBar.style.width = `${data.confidence}%`;
        
        // OOD alert check
        const oodAlert = document.getElementById('ood-alert');
        if (data.confidence < 60.0) {
            document.getElementById('ood-conf-val').innerText = data.confidence.toFixed(2);
            oodAlert.style.display = 'flex';
        } else {
            oodAlert.style.display = 'none';
        }
        
        // Severity
        const badge = document.getElementById('severity-badge');
        badge.innerText = data.severity;
        badge.className = "badge-cyber " + data.severity.toLowerCase(); // Reset classes
        
        // Details
        document.getElementById('result-symptoms').innerText = data.symptoms;
        document.getElementById('result-organic').innerText = data.organic;
        document.getElementById('result-chemical').innerText = data.chemical;
        
        // Precautions list
        const precautionsList = document.getElementById('result-precautions');
        precautionsList.innerHTML = '';
        data.precautions.forEach(step => {
            const li = document.createElement('li');
            li.innerText = step;
            precautionsList.appendChild(li);
        });
        
        // Hook up export download actions
        setupExportButtons(data);
        
        // Setup E-Commerce Quick Remedy Recommendations
        setupEcommerceRemedyBinding(data);
        
        // Notify chat context
        updateChatContextStatus();
        
        // Swap spinner to results panel
        loading.style.display = 'none';
        results.style.display = 'block';
        
        // Auto-refresh scan logs history in database
        fetchHistory();
    } catch (err) {
        console.error(err);
        loading.style.display = 'none';
        placeholder.style.display = 'flex';
        alert(`Classification Failure: ${err.message}`);
    }
}

function setupExportButtons(data) {
    const pdfBtn = document.getElementById('btn-export-pdf');
    const mdBtn = document.getElementById('btn-export-md');
    
    pdfBtn.onclick = async () => {
        pdfBtn.disabled = true;
        pdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...';
        
        try {
            const res = await fetch(BACKEND_URL + '/api/export-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    class_label: data.class_label,
                    confidence: data.confidence,
                    severity: data.severity
                })
            });
            
            if (!res.ok) throw new Error("Server error compiling PDF.");
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `crop_prescription_${data.class_label.toLowerCase()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            alert(`PDF Generation Failed: ${e.message}`);
        } finally {
            pdfBtn.disabled = false;
            pdfBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download PDF Action Plan';
        }
    };
    
    mdBtn.onclick = () => {
        const mdText = `
# AGRIVISION CROP HEALTH DIAGNOSIS REPORT
Generated: ${new Date().toLocaleString()}
=========================================================

## 🔍 HEALTH DIAGNOSTIC SUMMARY
- **Class Classified:** ${data.class_label.replace(/_/g, ' ')}
- **AI Classification Confidence:** ${data.confidence.toFixed(2)}%
- **Infection Severity Assessment:** ${data.severity}
- **Scan Status:** Active Infestation if not Healthy.

---------------------------------------------------------

## 📋 LEAF SYMPTOMS
${data.symptoms}

---------------------------------------------------------

## 🛡️ IMMEDIATE PRECAUTIONARY & PREVENTIVE MEASURES
${data.precautions.map((p, i) => `${i+1}. ${p}`).join('\n')}

---------------------------------------------------------

## 🌿 ORGANIC / BIOLOGICAL REMEDIATION
${data.organic}

---------------------------------------------------------

## 🧪 TARGETED CHEMICAL REMEDIATION
${data.chemical}
        `;
        
        const blob = new Blob([mdText], { type: "text/markdown" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crop_remediation_${data.class_label.toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
}

// =============================================================================
// 8. E-COMMERCE REMEDIES SHOP INTEGRATION & QUICK BUY
// =============================================================================
function setupEcommerceRemedyBinding(data) {
    state.lastPrescriptionData = data;
    const quickBuyBtn = document.getElementById('btn-quick-buy');
    const recContainer = document.getElementById('hud-recommended-products');
    
    // Find matching catalog remedies
    const matchingProducts = PRODUCTS_CATALOG.filter(p => p.diseaseLinks.includes(data.class_label));
    
    if (matchingProducts.length > 0) {
        // Find the lowest-priced recommended remedy
        const cheapestProduct = matchingProducts.reduce((min, p) => p.price < min.price ? p : min, matchingProducts[0]);
        const conCheapest = cheapestProduct.price * currencyState.rate;
        
        quickBuyBtn.innerHTML = `<i class="fa-solid fa-up-right-from-square"></i> Buy ${cheapestProduct.title} Online (Lowest Price: ${currencyState.symbol}${conCheapest.toFixed(2)})`;
        quickBuyBtn.style.display = 'block';
        
        quickBuyBtn.onclick = () => {
            window.open(cheapestProduct.externalUrl, '_blank');
        };
    } else {
        quickBuyBtn.style.display = 'none';
    }

    // Populate HUD recommended remedies shelf
    if (recContainer) {
        recContainer.innerHTML = '';
        if (matchingProducts.length > 0) {
            matchingProducts.forEach(product => {
                const conPrice = product.price * currencyState.rate;
                const conOrig = product.originalPrice * currencyState.rate;
                const card = document.createElement('div');
                card.className = 'treatment-box-cyber';
                card.style.background = 'var(--bg-light)';
                card.style.border = '1px solid var(--border-light)';
                card.style.borderRadius = '4px';
                card.style.padding = '12px';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.justifyContent = 'space-between';
                card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                
                card.innerHTML = `
                    <div style="display: flex; gap: 10px; align-items: start; margin-bottom: 8px;">
                        <img src="${product.image}" alt="${product.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-light);">
                        <div>
                            <h5 style="margin: 0; font-size: 13px; color: var(--text-main); font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3;">${product.title}</h5>
                            <span style="font-size: 14px; font-weight: bold; color: var(--cyber-neon-green); margin-top: 4px; display: inline-block;">${currencyState.symbol}${conPrice.toFixed(2)}</span>
                            <span style="font-size: 11px; text-decoration: line-through; color: var(--text-grey); margin-left: 5px;">${currencyState.symbol}${conOrig.toFixed(2)}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: auto;">
                        <button class="cyber-primary-btn w-100 btn-add-to-cart-rec" data-id="${product.id}" style="padding: 4px 8px; font-size: 11px;">
                            <i class="fa-solid fa-cart-plus"></i> Add to Cart
                        </button>
                        <a href="${product.externalUrl}" target="_blank" class="cyber-secondary-btn w-100 text-center" style="display: flex; align-items: center; justify-content: center; gap: 4px; text-decoration: none; padding: 4px 8px; font-size: 11px; box-sizing: border-box;">
                            <i class="fa-solid fa-up-right-from-square"></i> Buy Online (Lowest Price)
                        </a>
                    </div>
                `;
                
                const addBtn = card.querySelector('.btn-add-to-cart-rec');
                addBtn.addEventListener('click', () => {
                    addToCart(product.id);
                });
                
                recContainer.appendChild(card);
            });
        } else {
            recContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 10px; color: var(--text-grey); font-size: 12px;">No specific catalog remedies identified. Consult AI Agronomist above.</div>';
        }
    }
}

function initMarketplaceStore() {
    const filters = document.querySelectorAll('.filter-btn-cyber');
    
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const cat = btn.getAttribute('data-filter');
            renderProducts(cat);
        });
    });
}

function renderProducts(category, searchTerm = '') {
    const grid = document.getElementById('products-catalog-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    let filtered = category === 'all' 
        ? PRODUCTS_CATALOG 
        : PRODUCTS_CATALOG.filter(p => p.categories.includes(category));
        
    if (searchTerm) {
        filtered = filtered.filter(p => p.title.toLowerCase().includes(searchTerm) || p.desc.toLowerCase().includes(searchTerm));
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-grey);">No matching crop remedies found for your search query.</div>`;
        return;
    }
        
    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = "product-card";
        
        const conPrice = p.price * currencyState.rate;
        const conOrig = p.originalPrice * currencyState.rate;
        
        // Split dollar and cents for Amazon superscript styles
        const priceParts = conPrice.toFixed(2).split('.');
        const dollar = priceParts[0];
        const cents = priceParts[1];
        
        card.innerHTML = `
            <div class="product-img-wrapper">
                <span class="product-badge">${p.badge}</span>
                <img class="product-img" src="${p.image}" alt="${p.title}">
            </div>
            <div class="product-info-wrapper">
                <h4 class="product-title">${p.title}</h4>
                <p class="product-desc">${p.desc}</p>
                
                <div class="product-rating">
                    <div class="rating-stars">
                        ${'★'.repeat(Math.floor(p.rating))}${'☆'.repeat(5 - Math.floor(p.rating))}
                    </div>
                    <span class="rating-count">(${p.reviews})</span>
                </div>
                
                <div class="product-footer">
                    <div class="product-price-wrapper">
                        <span class="discount-price">${currencyState.symbol}${dollar}<sup>${cents}</sup></span>
                        <span class="original-price">${currencyState.symbol}${conOrig.toFixed(2)}</span>
                    </div>
                    
                    <div class="prime-delivery-flag">
                        <span class="prime-italic">✓ prime</span>
                        <span class="delivery-free">FREE Delivery</span>
                    </div>
                    
                    <button class="cyber-primary-btn w-100 mt-xs btn-add-to-cart" data-id="${p.id}">
                        <i class="fa-solid fa-cart-plus"></i> Add to Cart
                    </button>
                    <a href="${p.externalUrl}" target="_blank" class="cyber-secondary-btn w-100 mt-xs text-center" style="display: flex; text-decoration: none; align-items: center; justify-content: center; gap: 4px; box-sizing: border-box; padding: 6px 0;">
                        <i class="fa-solid fa-up-right-from-square"></i> Buy Online (Lowest Price)
                    </a>
                </div>
            </div>
        `;
        
        const addBtn = card.querySelector('.btn-add-to-cart');
        addBtn.addEventListener('click', () => {
            addToCart(p.id);
        });
        
        grid.appendChild(card);
    });
}

// =============================================================================
// 9. SHOPPING CART ENGINE & SIDEBAR
// =============================================================================
function initCartSidebarSystem() {
    const sidebar = document.getElementById('cart-sidebar');
    const openBtn = document.getElementById('open-cart-btn');
    const closeBtn = document.getElementById('close-cart-btn');
    
    openBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
    });
    
    closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });
}

function addToCart(productId, triggerAlert = true) {
    const product = PRODUCTS_CATALOG.find(p => p.id === productId);
    if (!product) return;
    
    const existing = state.cart.find(item => item.id === productId);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            externalUrl: product.externalUrl,
            quantity: 1
        });
    }
    
    localStorage.setItem('agrivision_cart', JSON.stringify(state.cart));
    updateCartUI();
    
    if (triggerAlert) {
        document.getElementById('cart-sidebar').classList.add('open');
    }
}

function updateCartUI() {
    const countBadge = document.getElementById('cart-badge-count');
    const container = document.getElementById('cart-sidebar-items');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    const totalQty = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    countBadge.innerText = totalQty;
    
    if (state.cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty-message-cyber">
                <i class="fa-solid fa-shopping-cart"></i>
                <p>Your shopping cart is empty.</p>
            </div>
        `;
        
        checkoutBtn.disabled = true;
        document.getElementById('cart-subtotal').innerText = "$0.00";
        document.getElementById('cart-tax').innerText = "$0.00";
        document.getElementById('cart-total').innerText = "$0.00";
        return;
    }
    
    checkoutBtn.disabled = false;
    container.innerHTML = '';
    
    let subtotal = 0;
    
    state.cart.forEach(item => {
        const itemCost = item.price * item.quantity;
        subtotal += itemCost;
        
        const conCost = item.price * currencyState.rate;
        
        const card = document.createElement('div');
        card.className = "cart-item-card";
        
        card.innerHTML = `
            <img class="cart-item-img" src="${item.image}" alt="${item.title}">
            <div class="cart-item-details">
                <span class="cart-item-title">${item.title}</span>
                <span class="cart-item-price">${currencyState.symbol}${conCost.toFixed(2)}</span>
                <a href="${item.externalUrl || '#'}" target="_blank" class="cart-item-link" style="color: var(--cyber-neon-green); font-size: 11px; text-decoration: none; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-up-right-from-square" style="font-size: 9px;"></i> Buy Online
                </a>
            </div>
            <div class="cart-item-actions">
                <div class="cart-qty-control">
                    <button class="cart-qty-btn qty-minus" data-id="${item.id}"><i class="fa-solid fa-minus"></i></button>
                    <span class="cart-qty-val">${item.quantity}</span>
                    <button class="cart-qty-btn qty-plus" data-id="${item.id}"><i class="fa-solid fa-plus"></i></button>
                </div>
                <button class="cart-item-remove" data-id="${item.id}"><i class="fa-solid fa-trash-can"></i> Remove</button>
            </div>
        `;
        
        card.querySelector('.qty-plus').onclick = () => {
            item.quantity += 1;
            saveAndRefreshCart();
        };
        
        card.querySelector('.qty-minus').onclick = () => {
            if (item.quantity > 1) {
                item.quantity -= 1;
            } else {
                state.cart = state.cart.filter(c => c.id !== item.id);
            }
            saveAndRefreshCart();
        };
        
        card.querySelector('.cart-item-remove').onclick = () => {
            state.cart = state.cart.filter(c => c.id !== item.id);
            saveAndRefreshCart();
        };
        
        container.appendChild(card);
    });
    
    const tax = subtotal * 0.0825;
    const grandTotal = subtotal + tax;
    
    const conSub = subtotal * currencyState.rate;
    const conTax = tax * currencyState.rate;
    const conTotal = grandTotal * currencyState.rate;
    
    document.getElementById('cart-subtotal').innerText = `${currencyState.symbol}${conSub.toFixed(2)}`;
    document.getElementById('cart-tax').innerText = `${currencyState.symbol}${conTax.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `${currencyState.symbol}${conTotal.toFixed(2)}`;
}

function saveAndRefreshCart() {
    localStorage.setItem('agrivision_cart', JSON.stringify(state.cart));
    updateCartUI();
}

// =============================================================================
// 10. SIMULATED CHECKOUT GATEWAY & ORDER SUCCESS
// =============================================================================
function initCheckoutSystem() {
    const sidebar = document.getElementById('cart-sidebar');
    const checkoutBtn = document.getElementById('checkout-btn');
    const modal = document.getElementById('checkout-modal');
    const closeBtn = document.getElementById('close-checkout-modal');
    
    const payTotalSpan = document.getElementById('checkout-pay-total');
    
    checkoutBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
        modal.classList.add('open');
        payTotalSpan.innerText = document.getElementById('cart-total').innerText;
    });
    
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
    });
    
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        modal.classList.remove('open');
        
        // Clear shopping cart state
        state.cart = [];
        saveAndRefreshCart();
        
        // Show success modal
        document.getElementById('success-modal').classList.add('open');
    });
    
    document.getElementById('close-success-modal').onclick = () => {
        document.getElementById('success-modal').classList.remove('open');
    };
    
    document.getElementById('close-checkout-modal').onclick = () => {
        modal.classList.remove('open');
    };
}

// =============================================================================
// 11. DATABASE HISTORIES LOGGER
// =============================================================================
async function fetchHistory() {
    const tableBody = document.getElementById('history-table-body');
    
    try {
        const userIdParam = currentUser ? currentUser.id : 'null';
        const response = await fetch(BACKEND_URL + `/api/history?user_id=${userIdParam}`);
        if (!response.ok) throw new Error("Failed fetching records.");
        
        state.historyData = await response.json();
        updateDashboardMetrics(state.historyData);
        
        const total = state.historyData.length;
        const recovered = state.historyData.filter(r => r.status === 'Recovered' || r.class_label === 'Healthy').length;
        const active = total - recovered;
        
        document.getElementById('total-scans-metric').innerText = total;
        document.getElementById('recovered-scans-metric').innerText = recovered;
        document.getElementById('active-scans-metric').innerText = active;
        
        tableBody.innerHTML = '';
        
        if (state.historyData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="table-loading-msg-cyber">No diagnostic scans found in database. Perform a leaf scan to log data!</td></tr>`;
            return;
        }
        
        state.historyData.forEach(row => {
            const tr = document.createElement('tr');
            
            const isCured = row.status === 'Recovered' || row.class_label === 'Healthy';
            const statusClass = isCured ? 'cured' : 'infested';
            
            let actionBtnHtml = '';
            if (row.class_label !== 'Healthy' && row.status === 'Active Infestation') {
                actionBtnHtml = `<button class="cyber-primary-btn btn-sm btn-cure" data-id="${row.id}"><i class="fa-solid fa-square-check"></i> Mark Cured</button>`;
            } else {
                actionBtnHtml = `<button class="cyber-secondary-btn btn-sm btn-delete" data-id="${row.id}"><i class="fa-solid fa-trash"></i> Delete</button>`;
            }
            
            // Build visual image thumbnail or fallback layout
            let imageHtml = '';
            if (row.filename && row.filename.startsWith('scan_')) {
                imageHtml = `<img src="${BACKEND_URL}/static/uploads/${row.filename}" class="history-thumbnail-cyber" alt="Scan thumbnail" data-label="${row.class_label.replace(/_/g, ' ')}" data-time="${row.timestamp}">`;
            } else {
                imageHtml = `<div class="history-thumbnail-placeholder-cyber"><i class="fa-solid fa-leaf"></i></div>`;
            }
            
            tr.innerHTML = `
                <td>${imageHtml}</td>
                <td>${row.timestamp}</td>
                <td><strong>${row.class_label.replace(/_/g, ' ')}</strong></td>
                <td>${row.confidence.toFixed(1)}%</td>
                <td><span class="badge-cyber">${row.severity}</span></td>
                <td><span class="history-status ${statusClass}">${row.status}</span></td>
                <td>${actionBtnHtml}</td>
            `;
            
            tableBody.appendChild(tr);
        });
        
        bindHistoryActions();
        bindLightboxEvents();
    } catch (e) {
        console.error(e);
        tableBody.innerHTML = `<tr><td colspan="7" class="table-loading-msg-cyber" style="color:var(--color-red);">Error accessing scan database logs.</td></tr>`;
    }
}

function updateDashboardMetrics(data) {
    const scanCountEl = document.getElementById('dashboard-scan-count');
    const outbreakCountEl = document.getElementById('dashboard-outbreak-count');
    const feedEl = document.getElementById('dashboard-recent-feed');
    
    if (scanCountEl) {
        scanCountEl.innerText = data.length;
    }
    
    if (outbreakCountEl) {
        const outbreaks = data.filter(item => item.class_label && item.class_label !== 'Healthy').length;
        outbreakCountEl.innerText = outbreaks;
    }
    
    if (feedEl) {
        feedEl.innerHTML = '';
        if (!data || data.length === 0) {
            feedEl.innerHTML = `
                <div class="feed-empty-state-cyber">
                    <i class="fa-solid fa-folder-open"></i>
                    <span>No diagnostic records logged yet.</span>
                </div>
            `;
            return;
        }
        
        // Take up to 3 recent items
        const recent = data.slice(0, 3);
        recent.forEach(item => {
            const div = document.createElement('div');
            div.className = 'hud-feed-item-cyber';
            
            // Format time
            let dateStr = item.timestamp || 'Just Now';
            try {
                const dateObj = new Date(item.timestamp);
                if (!isNaN(dateObj)) {
                    dateStr = dateObj.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) + ' ' + dateObj.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'});
                }
            } catch (e) {}
            
            const isHealthy = item.class_label === 'Healthy';
            const statusClass = isHealthy ? 'ok' : 'alert';
            const icon = isHealthy ? 'fa-circle-check' : 'fa-circle-exclamation';
            
            div.innerHTML = `
                <div class="hud-feed-info-cyber">
                    <span class="hud-feed-title-cyber">${item.class_label.replace(/_/g, ' ')}</span>
                    <span class="hud-feed-time-cyber">${dateStr}</span>
                </div>
                <div class="hud-feed-badge-cyber ${statusClass}">
                    <i class="fa-solid ${icon}"></i>
                    <span>${isHealthy ? 'Healthy' : (item.severity || 'Outbreak')}</span>
                </div>
            `;
            feedEl.appendChild(div);
        });
    }
}

function bindHistoryActions() {
    document.querySelectorAll('.btn-cure').forEach(btn => {
        btn.addEventListener('click', async () => {
            const rid = btn.getAttribute('data-id');
            try {
                const res = await fetch(BACKEND_URL + '/api/history/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: rid, status: 'Recovered' })
                });
                if (res.ok) fetchHistory();
            } catch (e) { console.error(e); }
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const rid = btn.getAttribute('data-id');
            if (!confirm("Are you sure you want to permanently delete this scan log?")) return;
            
            try {
                const res = await fetch(BACKEND_URL + '/api/history/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: rid })
                });
                if (res.ok) fetchHistory();
            } catch (e) { console.error(e); }
        });
    });
}

// =============================================================================
// 12. AI CHAT ROUTINES
// =============================================================================
function initChatSystem() {
    const input = document.getElementById('chat-user-input');
    const sendBtn = document.getElementById('chat-send-btn');
    
    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;
        
        appendChatBubble('user', text);
        input.value = '';
        
        const loadingBubble = appendChatBubble('assistant-loading', '');
        
        try {
            const response = await fetch(BACKEND_URL + '/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    active_diagnosis: state.activeDiagnosis,
                    active_confidence: state.activeConfidence,
                    api_key: state.geminiKey,
                    user_id: currentUser ? currentUser.id : null
                })
            });
            
            loadingBubble.remove();
            
            if (!response.ok) throw new Error("Server returned API connection error.");
            
            const data = await response.json();
            appendChatBubble('assistant', data.reply);
        } catch (e) {
            loadingBubble.remove();
            appendChatBubble('assistant', `🤖 Connection lost: ${e.message}`);
        }
    };
    
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function updateChatContextStatus() {
    const bar = document.getElementById('chat-context-status');
    if (state.activeDiagnosis) {
        bar.innerHTML = `💡 <strong>Active Context Loaded:</strong> ${state.activeDiagnosis.replace(/_/g, ' ')} (${state.activeConfidence.toFixed(1)}% confidence)`;
    } else {
        bar.innerText = "No active crop context loaded. Diagnostic scans populate this automatically.";
    }
}

function appendChatBubble(sender, text) {
    const area = document.getElementById('chat-dialog-area');
    const bubble = document.createElement('div');
    
    if (sender === 'user') {
        bubble.className = "chat-bubble-cyber user-bubble-cyber";
        bubble.innerHTML = `
            <i class="fa-solid fa-user bubble-avatar-cyber"></i>
            <div class="bubble-content-cyber"><p>${text}</p></div>
        `;
    } else if (sender === 'assistant') {
        bubble.className = "chat-bubble-cyber assistant-bubble-cyber";
        
        let htmlText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\*\s(.*)$/gm, '<li>$1</li>');
        
        if (htmlText.includes('<li>')) {
            htmlText = htmlText.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
        }
        
        bubble.innerHTML = `
            <i class="fa-solid fa-user-doctor bubble-avatar-cyber"></i>
            <div class="bubble-content-cyber"><p>${htmlText.replace(/\n/g, '<br>')}</p></div>
        `;
    } else if (sender === 'assistant-loading') {
        bubble.className = "chat-bubble-cyber assistant-bubble-cyber";
        bubble.innerHTML = `
            <i class="fa-solid fa-user-doctor bubble-avatar-cyber"></i>
            <div class="bubble-content-cyber">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
    }
    
    area.appendChild(bubble);
    area.scrollTop = area.scrollHeight;
    
    return bubble;
}

// =============================================================================
// 13. MAPS & FORECASTING
// =============================================================================
function initWebGISMap() {
    if (state.leafletMap) return;
    
    // Centered globally with zoom 2
    state.leafletMap = L.map('webgis-map').setView([20, 0], 2);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(state.leafletMap);
    
    // Global agricultural outbreak hotspots database
    const hotspotData = [
        // India (Asia)
        { loc: [12.9716, 77.5946], type: "Tomato Leaf Curl Virus (India-G Strain)", severity: "High", size: "8,500 hectares affected" },
        { loc: [18.5204, 73.8567], type: "Bacterial Spot Outbreak (Xanthomonas)", severity: "Medium", size: "3,200 hectares affected" },
        
        // Europe & Mediterranean
        { loc: [37.3891, -5.9845], type: "Tomato Late Blight Spore Outbreak (Spain)", severity: "High", size: "1,200 commercial farms affected" },
        { loc: [41.9028, 12.4964], type: "Olive Decline Syndrome (Xylella Fastidiosa - Italy)", severity: "High", size: "4,500 groves quarantined" },
        
        // Africa
        { loc: [-1.2921, 36.8219], type: "Fall Armyworm Maize Outbreak (Kenya)", severity: "High", size: "12,000 hectares impacted" },
        { loc: [-33.9249, 18.4241], type: "Powdery Mildew Vine Infection (Cape Town)", severity: "Low", size: "450 vineyards affected" },
        
        // South America
        { loc: [-23.5505, -46.6333], type: "Citrus Greening Vector (Sao Paulo, Brazil)", severity: "High", size: "15,000 commercial groves affected" },
        { loc: [4.7110, -74.0721], type: "Coffee Leaf Rust Outbreak (Hemileia - Colombia)", severity: "Medium", size: "6,800 coffee plantations" },
        
        // North America
        { loc: [36.7783, -119.8242], type: "Tomato Leaf Curl Outbreak (California, USA)", severity: "High", size: "2,500 acres affected" },
        { loc: [27.6648, -81.5158], type: "Spider Mite Vector Infestation (Florida, USA)", severity: "Medium", size: "1,800 orange groves affected" },
        
        // Australia
        { loc: [-27.4698, 153.0251], type: "Tomato Yellow Leaf Curl Virus (Queensland)", severity: "Medium", size: "750 farms affected" }
    ];
    
    hotspotData.forEach(item => {
        const color = item.severity === 'High' ? 'var(--color-red)' : item.severity === 'Medium' ? 'var(--color-yellow)' : 'var(--color-green)';
        
        // Setting a larger radius of 150km for high-visibility worldwide scale
        const circle = L.circle(item.loc, {
            color: color,
            fillColor: color,
            fillOpacity: 0.25,
            radius: 150000
        }).addTo(state.leafletMap);
        
        circle.bindPopup(`
            <strong style="color:${color};font-size:13px;">📍 ${item.type}</strong><br>
            <strong>Severity:</strong> ${item.severity}<br>
            <strong>Impact Area:</strong> ${item.size}
        `);
    });
}

function getThemeChartColors() {
    const isLight = document.body.classList.contains('theme-light');
    return {
        textMain: isLight ? '#0f172a' : '#e2f4ea',
        textGrey: isLight ? '#475569' : '#a3c9b8',
        gridColor: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(46, 204, 113, 0.15)'
    };
}

function updateChartThemeColors() {
    const colors = getThemeChartColors();

    if (state.forecastingChart) {
        state.forecastingChart.options.plugins.legend.labels.color = colors.textMain;
        state.forecastingChart.options.scales.x.grid.color = colors.gridColor;
        state.forecastingChart.options.scales.x.ticks.color = colors.textGrey;
        state.forecastingChart.options.scales.y.grid.color = colors.gridColor;
        state.forecastingChart.options.scales.y.ticks.color = colors.textGrey;
        state.forecastingChart.update();
    }
    if (state.convergenceChart) {
        state.convergenceChart.options.plugins.legend.labels.color = colors.textMain;
        state.convergenceChart.options.scales.x.grid.color = colors.gridColor;
        state.convergenceChart.options.scales.x.ticks.color = colors.textGrey;
        state.convergenceChart.options.scales.x.title.color = colors.textGrey;
        state.convergenceChart.options.scales.y.grid.color = colors.gridColor;
        state.convergenceChart.options.scales.y.ticks.color = colors.textGrey;
        state.convergenceChart.options.scales.y.title.color = colors.textGrey;
        state.convergenceChart.update();
    }
}

function initForecastingChart() {
    if (state.forecastingChart) return;
    
    const ctx = document.getElementById('forecasting-chart').getContext('2d');
    const colors = getThemeChartColors();
    
    state.forecastingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            datasets: [
                {
                    label: "Fungal Risks (Blight/Mold)",
                    data: [10, 15, 30, 60, 85, 75, 45, 30, 55, 70, 40, 20],
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.05)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2
                },
                {
                    label: "Insect Risks (Mites/Miners)",
                    data: [5, 10, 25, 45, 65, 90, 95, 80, 50, 35, 15, 5],
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.05)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: colors.textMain, font: { family: 'Outfit', weight: '600' } }
                }
            },
            scales: {
                x: {
                    grid: { color: colors.gridColor },
                    ticks: { color: colors.textGrey }
                },
                y: {
                    grid: { color: colors.gridColor },
                    ticks: { color: colors.textGrey },
                    suggestedMax: 100
                }
            }
        }
    });
}

function initConvergenceChart() {
    if (state.convergenceChart) return;
    
    const ctx = document.getElementById('convergence-chart').getContext('2d');
    const colors = getThemeChartColors();
    
    state.convergenceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 15}, (_, i) => i + 1),
            datasets: [
                {
                    label: "Training Accuracy",
                    data: [0.22, 0.43, 0.57, 0.63, 0.69, 0.73, 0.76, 0.80, 0.82, 0.83, 0.85, 0.86, 0.87, 0.87, 0.89],
                    borderColor: '#27ae60',
                    borderWidth: 2,
                    tension: 0.1,
                    pointBackgroundColor: '#27ae60'
                },
                {
                    label: "Validation Accuracy",
                    data: [0.48, 0.67, 0.73, 0.80, 0.84, 0.85, 0.85, 0.87, 0.88, 0.88, 0.89, 0.90, 0.91, 0.91, 0.92],
                    borderColor: '#f39c12',
                    borderWidth: 2,
                    tension: 0.1,
                    pointBackgroundColor: '#f39c12'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: colors.textMain, font: { family: 'Outfit', weight: '600' } }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Training Epochs', color: colors.textGrey, font: { weight: '600' } },
                    grid: { color: colors.gridColor },
                    ticks: { color: colors.textGrey }
                },
                y: {
                    title: { display: true, text: 'Accuracy Rate (%)', color: colors.textGrey, font: { weight: '600' } },
                    grid: { color: colors.gridColor },
                    ticks: { color: colors.textGrey }
                }
            }
        }
    });
}

// =============================================================================
// 14. LITERATURE ACCORDIONS
// =============================================================================
function initLiteratureLibrary() {
    const container = document.getElementById('papers-accordion');
    if (!container) return;
    
    container.innerHTML = '';
    
    PAPERS_DATABASE.forEach((paper, idx) => {
        const item = document.createElement('div');
        item.className = "accordion-item";
        
        item.innerHTML = `
            <button class="accordion-header">
                <span>📄 [${idx+1}] ${paper.title}</span>
                <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="accordion-content">
                <div class="accordion-body">
                    <h4>🔬 Architectural Impact on this MVP:</h4>
                    <p>${paper.impact}</p>
                    <h4>🛠️ Primary Research Technical Focus:</h4>
                    <p><em>${paper.technique}</em></p>
                </div>
            </div>
        `;
        
        const header = item.querySelector('.accordion-header');
        header.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            document.querySelectorAll('.accordion-item').forEach(el => {
                el.classList.remove('active');
                el.querySelector('.accordion-content').style.maxHeight = '0px';
            });
            
            if (!isActive) {
                item.classList.add('active');
                const content = item.querySelector('.accordion-content');
                content.style.maxHeight = `${content.scrollHeight + 40}px`;
            }
        });
        
        container.appendChild(item);
    });
}

// =============================================================================
// 15. DYNAMIC COLOR SCHEME & PREMIUM THEME TOGGLING
// =============================================================================
function initThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    const icon = document.getElementById('theme-icon');
    
    // Apply saved theme on start
    const savedTheme = localStorage.getItem('color-scheme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('theme-light');
        if (icon) {
            icon.className = "fa-solid fa-sun";
            icon.style.color = "var(--cyber-neon-amber)";
        }
    } else {
        document.body.classList.remove('theme-light');
        if (icon) {
            icon.className = "fa-solid fa-moon";
            icon.style.color = "var(--cyber-neon-blue)";
        }
    }
    
    if (btn) {
        btn.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('theme-light');
            localStorage.setItem('color-scheme', isLight ? 'light' : 'dark');
            
            if (icon) {
                if (isLight) {
                    icon.className = "fa-solid fa-sun";
                    icon.style.color = "var(--cyber-neon-amber)";
                    icon.style.transform = "rotate(360deg)";
                } else {
                    icon.className = "fa-solid fa-moon";
                    icon.style.color = "var(--cyber-neon-blue)";
                    icon.style.transform = "rotate(0deg)";
                }
            }
            updateChartThemeColors();
        });
    }
}

// =============================================================================
// 16. LOCATION-DRIVEN GEOLOCATION & EXCHANGES HUB
// =============================================================================
function initCurrencySystem() {
    const select = document.getElementById('currency-select');
    
    const updateCurrency = (curr) => {
        if (!CURRENCY_RATES[curr]) return;
        currencyState.current = curr;
        currencyState.rate = CURRENCY_RATES[curr].rate;
        currencyState.symbol = CURRENCY_RATES[curr].symbol;
        
        if (select) select.value = curr;
        
        // Re-render marketplace catalog
        if (state.activeTab === 'tab-marketplace') {
            renderProducts(document.querySelector('.filter-btn-cyber.active')?.getAttribute('data-filter') || 'all');
        } else {
            renderProducts('all');
        }
        
        // Re-render Quick Buy and recommended shelves
        if (state.activeDiagnosis && state.lastPrescriptionData) {
            setupEcommerceRemedyBinding(state.lastPrescriptionData);
        }
        
        // Update shopping cart drawer pricing
        updateCartUI();
    };
    
    if (select) {
        select.addEventListener('change', (e) => {
            updateCurrency(e.target.value);
        });
    }
    
    // Auto IP Geolocation query
    fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(loc => {
            let autoCurrency = 'USD';
            if (loc.country_code === 'IN') autoCurrency = 'INR';
            else if (['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'FI', 'IE', 'PT', 'AT', 'GR'].includes(loc.country_code)) autoCurrency = 'EUR';
            else if (loc.country_code === 'GB') autoCurrency = 'GBP';
            
            updateCurrency(autoCurrency);
        })
        .catch(err => {
            console.warn("Geolocation API failure: defaulting to manual/local selection.", err);
        });
}

// =============================================================================
// 17. MODERN AUTH SYSTEM — LOGIN, REGISTER & SESSION MANAGEMENT
// =============================================================================
function initAuthSystem() {
    const authOverlay = document.getElementById('auth-overlay');
    const tabLogin = document.getElementById('auth-tab-login');
    const tabRegister = document.getElementById('auth-tab-register');
    const tabIndicator = document.getElementById('auth-tab-indicator');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const bypassBtn = document.getElementById('bypass-guest-btn');
    const errorBanner = document.getElementById('auth-error-banner');
    const errorMsg = document.getElementById('auth-error-msg');
    const successBanner = document.getElementById('auth-success-banner');
    const successMsg = document.getElementById('auth-success-msg');
    
    const userBadge = document.getElementById('hud-user-badge');
    const logoutBtn = document.getElementById('auth-logout-btn');
    
    // --- Utility: Show / Hide banners ---
    const hideBanners = () => {
        if (errorBanner) errorBanner.style.display = 'none';
        if (successBanner) successBanner.style.display = 'none';
    };
    
    const showError = (msg) => {
        hideBanners();
        if (errorMsg && errorBanner) {
            errorMsg.innerText = msg;
            errorBanner.style.display = 'flex';
            setTimeout(() => { errorBanner.style.display = 'none'; }, 6000);
        }
    };
    
    const showSuccess = (msg) => {
        hideBanners();
        if (successMsg && successBanner) {
            successMsg.innerText = msg;
            successBanner.style.display = 'flex';
            setTimeout(() => { successBanner.style.display = 'none'; }, 5000);
        }
    };
    
    // --- Utility: Set loading state on button ---
    const setLoading = (btn, loading) => {
        if (!btn) return;
        const text = btn.querySelector('.auth-btn-text');
        const loader = btn.querySelector('.auth-btn-loader');
        if (text) text.style.display = loading ? 'none' : 'inline';
        if (loader) loader.style.display = loading ? 'inline-flex' : 'none';
        btn.disabled = loading;
    };
    
    // --- Update UI for logged-in/out user ---
    const updateUIForUser = (user) => {
        if (user) {
            currentUser = user;
            localStorage.setItem('agrivision_user', JSON.stringify(user));
            if (userBadge) {
                userBadge.innerHTML = `<i class="fa-solid fa-user-check" style="color:var(--cyber-neon-green);"></i> <span>${user.full_name || user.username}</span>`;
            }
            if (logoutBtn) logoutBtn.style.display = 'inline-flex';
            if (authOverlay) authOverlay.classList.remove('open');
            
            // Automatically sync Gemini API Key from database profile
            if (user.gemini_api_key) {
                state.geminiKey = user.gemini_api_key;
                localStorage.setItem('gemini_api_key', user.gemini_api_key);
                syncKeyUI();
            }
        } else {
            currentUser = null;
            localStorage.removeItem('agrivision_user');
            if (userBadge) {
                userBadge.innerHTML = `<i class="fa-solid fa-user-astronaut" style="color:var(--cyber-neon-green);"></i> <span>Guest Mode</span>`;
            }
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (authOverlay) authOverlay.classList.add('open');
            
            // Restore whatever is in localStorage or reset
            state.geminiKey = localStorage.getItem('gemini_api_key') || '';
            syncKeyUI();
        }
    };
    
    // --- Password visibility eye toggles ---
    document.querySelectorAll('.auth-eye-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const eyeIcon = btn.querySelector('i');
            
            if (input && eyeIcon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    eyeIcon.className = 'fa-solid fa-eye-slash';
                    eyeIcon.style.color = '#00f59b';
                } else {
                    input.type = 'password';
                    eyeIcon.className = 'fa-solid fa-eye';
                    eyeIcon.style.color = '';
                }
            }
        });
    });
    
    // --- Tab Toggling with sliding indicator ---
    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            if (tabIndicator) tabIndicator.classList.remove('right');
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            hideBanners();
        });
        
        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            if (tabIndicator) tabIndicator.classList.add('right');
            registerForm.style.display = 'block';
            loginForm.style.display = 'none';
            hideBanners();
        });
    }
    
    // --- Password Strength Meter ---
    const regPassword = document.getElementById('register-password');
    const pwFill = document.getElementById('pw-strength-fill');
    const pwLabel = document.getElementById('pw-strength-label');
    
    if (regPassword) {
        regPassword.addEventListener('input', () => {
            const pw = regPassword.value;
            let strength = 0;
            if (pw.length >= 6) strength++;
            if (pw.length >= 10) strength++;
            if (/[A-Z]/.test(pw)) strength++;
            if (/[0-9]/.test(pw)) strength++;
            if (/[^A-Za-z0-9]/.test(pw)) strength++;
            
            const levels = [
                { width: '0%', color: '', label: '' },
                { width: '20%', color: '#ef4444', label: 'Very weak' },
                { width: '40%', color: '#f97316', label: 'Weak' },
                { width: '60%', color: '#facc15', label: 'Fair' },
                { width: '80%', color: '#22c55e', label: 'Strong' },
                { width: '100%', color: '#00f59b', label: 'Very strong' }
            ];
            
            const level = levels[strength] || levels[0];
            if (pwFill) {
                pwFill.style.width = level.width;
                pwFill.style.background = level.color;
            }
            if (pwLabel) {
                pwLabel.innerText = pw.length > 0 ? level.label : '';
                pwLabel.className = 'auth-field-hint ' + (strength >= 3 ? 'success' : strength >= 1 ? 'error' : '');
            }
        });
    }
    
    // --- Confirm Password Validation ---
    const confirmPw = document.getElementById('register-confirm-password');
    const confirmHint = document.getElementById('confirm-pw-hint');
    
    if (confirmPw && regPassword) {
        confirmPw.addEventListener('input', () => {
            if (confirmPw.value.length === 0) {
                if (confirmHint) { confirmHint.innerText = ''; confirmHint.className = 'auth-field-hint'; }
                confirmPw.classList.remove('error-field', 'success-field');
            } else if (confirmPw.value === regPassword.value) {
                if (confirmHint) { confirmHint.innerText = 'Passwords match ✓'; confirmHint.className = 'auth-field-hint success'; }
                confirmPw.classList.remove('error-field');
                confirmPw.classList.add('success-field');
            } else {
                if (confirmHint) { confirmHint.innerText = 'Passwords do not match'; confirmHint.className = 'auth-field-hint error'; }
                confirmPw.classList.add('error-field');
                confirmPw.classList.remove('success-field');
            }
        });
    }
    
    // --- Bypass as Guest handler ---
    if (bypassBtn) {
        bypassBtn.addEventListener('click', () => {
            currentUser = null;
            localStorage.removeItem('agrivision_user');
            if (userBadge) {
                userBadge.innerHTML = `<i class="fa-solid fa-user-secret" style="color:var(--cyber-neon-amber);"></i> <span>Guest Mode</span>`;
            }
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (authOverlay) authOverlay.classList.remove('open');
            fetchHistory();
        });
    }
    
    // --- Form Login Submit ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideBanners();
            
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            
            if (!username || !password) {
                showError('Please fill in all fields.');
                return;
            }
            
            const submitBtn = document.getElementById('login-submit-btn');
            setLoading(submitBtn, true);
            
            try {
                const response = await fetch(BACKEND_URL + '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                if (response.ok && data.success) {
                    showSuccess(`Welcome back, ${data.user.full_name || data.user.username}!`);
                    setTimeout(() => {
                        updateUIForUser(data.user);
                        fetchHistory();
                    }, 800);
                } else {
                    showError(data.error || 'Invalid username or password.');
                }
            } catch (err) {
                showError('Network error. Please check your connection.');
            } finally {
                setLoading(submitBtn, false);
            }
        });
    }
    
    // --- Form Register Submit ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideBanners();
            
            const fullName = document.getElementById('register-fullname').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const username = document.getElementById('register-username').value.trim();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            
            // Client-side validation
            if (!email || !username || !password) {
                showError('Please fill in all required fields.');
                return;
            }
            
            if (password.length < 6) {
                showError('Password must be at least 6 characters long.');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('Passwords do not match.');
                return;
            }
            
            if (!email.includes('@') || !email.includes('.')) {
                showError('Please enter a valid email address.');
                return;
            }
            
            const submitBtn = document.getElementById('register-submit-btn');
            setLoading(submitBtn, true);
            
            try {
                const response = await fetch(BACKEND_URL + '/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, username, password, full_name: fullName })
                });
                
                const data = await response.json();
                if (response.ok && data.success) {
                    showSuccess('Account created successfully! Logging you in...');
                    // Auto login after register
                    setTimeout(() => {
                        updateUIForUser(data.user);
                        fetchHistory();
                    }, 1200);
                } else {
                    showError(data.error || 'Registration failed. Please try again.');
                }
            } catch (err) {
                showError('Network error. Please check your connection.');
            } finally {
                setLoading(submitBtn, false);
            }
        });
    }
    
    // --- Logout Action ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            updateUIForUser(null);
            // Clear form fields
            if (loginForm) loginForm.reset();
            if (registerForm) registerForm.reset();
            // Reset to login tab
            if (tabLogin) tabLogin.click();
            // Reload after a brief moment
            setTimeout(() => location.reload(), 300);
        });
    }
    
    // --- Check local session on load ---
    if (currentUser) {
        updateUIForUser(currentUser);
    } else {
        updateUIForUser(null);
    }
}

// =============================================================================
// 18. PREMIUM HAMBURGER MENU DROPDOWN CONTROLLER
// =============================================================================
function initHamburgerMenu() {
    const btn = document.getElementById('hamburger-menu-btn');
    const dropdown = document.getElementById('hamburger-menu-dropdown');
    
    if (btn && dropdown) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display === 'flex';
            dropdown.style.display = isOpen ? 'none' : 'flex';
            btn.classList.toggle('active', !isOpen);
        });
        
        // Dynamic click-outside-to-dismiss pattern
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
                dropdown.style.display = 'none';
                btn.classList.remove('active');
            }
        });
        
        // Prevent dismissal when clicking inside the dropdown
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

// =============================================================================
// 19. ADVANCED MULTI-MODAL DIAGNOSTICS & VISUAL LIGHTBOXES
// =============================================================================
function initAdvancedDiagnostics() {
    const lightboxModal = document.getElementById('lightbox-modal');
    const closeBtn = document.getElementById('lightbox-close-btn');
    
    if (closeBtn && lightboxModal) {
        closeBtn.addEventListener('click', () => {
            lightboxModal.style.display = 'none';
        });
        
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                lightboxModal.style.display = 'none';
            }
        });
    }

    // Connect OOD low-confidence Gemini diagnostics retry trigger
    const retryBtn = document.getElementById('ood-gemini-retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            const aiToggle = document.getElementById('ai-mode-toggle');
            if (aiToggle) aiToggle.checked = true;
            
            if (state.activeFile) {
                executeInference(state.activeFile);
            } else {
                alert("No active scan image found. Please upload or snap a photo first.");
            }
        });
    }
}

function bindLightboxEvents() {
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxCaption = document.getElementById('lightbox-caption');
    
    if (!lightboxModal) return;
    
    document.querySelectorAll('.history-thumbnail-cyber').forEach(img => {
        img.onclick = () => {
            if (lightboxImage && lightboxCaption) {
                lightboxImage.src = img.src;
                const label = img.getAttribute('data-label') || 'Pathology Scan';
                const time = img.getAttribute('data-time') || 'Logged time';
                lightboxCaption.innerText = `${label} (${time})`;
                lightboxModal.style.display = 'flex';
            }
        };
    });
}
