import requests
import os
import sqlite3

def run_test():
    image_path = "/Users/jmdhanyakumar/Desktop/MPROJECT/dataset/Healthy/IMG_3459_%02d.jpg"
    if not os.path.exists(image_path):
        print(f"Error: Sample image not found at {image_path}")
        return
        
    print(f"1. Performing mock scan with image: {image_path}")
    url = "http://localhost:5001/api/predict"
    
    with open(image_path, 'rb') as f:
        files = {'file': ('test_leaf.jpg', f, 'image/jpeg')}
        data = {'mode': 'local'}
        
        try:
            response = requests.post(url, files=files, data=data)
            if response.status_code != 200:
                print(f"Error: API returned status {response.status_code}. Response: {response.text}")
                return
                
            res_json = response.json()
            print("API Response successfully received:")
            print(f"  Class Label: {res_json.get('class_label')}")
            print(f"  Confidence: {res_json.get('confidence'):.2f}%")
            print(f"  Severity: {res_json.get('severity')}")
            print(f"  Filename: {res_json.get('filename')}")
            
            saved_filename = res_json.get('filename')
            
        except Exception as e:
            print(f"Error connecting to server: {e}")
            return
            
    print("\n2. Checking if image file is saved in static/uploads/")
    saved_path = os.path.join("/Users/jmdhanyakumar/Desktop/MPROJECT/static/uploads", saved_filename)
    if os.path.exists(saved_path):
        print(f"  Success: Image saved at {saved_path} (Size: {os.path.getsize(saved_path)} bytes)")
    else:
        print(f"  Failure: Image not found at {saved_path}!")
        
    print("\n3. Querying SQLite database for logged record")
    db_path = "/Users/jmdhanyakumar/Desktop/MPROJECT/agrivision.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scans WHERE filename = ?", (saved_filename,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        print("  Success: Record logged in SQLite scans table:")
        print(f"    ID: {row[0]}")
        print(f"    Timestamp: {row[1]}")
        print(f"    Class: {row[2]}")
        print(f"    Confidence: {row[3]:.2f}%")
        print(f"    Severity: {row[4]}")
        print(f"    Status: {row[5]}")
        print(f"    Filename: {row[6]}")
    else:
        print(f"  Failure: No database record found for filename {saved_filename}!")
        
    print("\n4. Checking history endpoint")
    history_url = "http://localhost:5001/api/history?user_id=null"
    try:
        hist_resp = requests.get(history_url)
        hist_json = hist_resp.json()
        matching_scans = [r for r in hist_json if r.get('filename') == saved_filename]
        if matching_scans:
            print("  Success: /api/history returns the record with the correct filename!")
        else:
            print("  Failure: Record not returned by /api/history!")
    except Exception as e:
        print(f"Error querying history API: {e}")

if __name__ == "__main__":
    run_test()
