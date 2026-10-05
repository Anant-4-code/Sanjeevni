import urllib.request
import json

raw_text = """22/12/22
Adichunchanagiri University
Adichunchanagiri Institute of Medical Sciences
Hospital & Research Centre
Balagangadharanatha Nagara-571448
Name: Vivek S (19/M)
UHID/IP No: 10193
c/o giddiness, restlessness
Imp: hypoglycemia (RBS - 50 mg/dl)
o/e - BP - 110/70, PR - 60 bpm
Adv:
1) 5% Dextrose (iv) stat
-> Adequate fluid intake
-> ORS 2 sachets
Signature of Doctor [131441]"""

prompt = f"""Extract structured prescription info from this clinical text into JSON:
{raw_text}

Required JSON format:
{{
  "title": "Hospital or Clinic Name",
  "doctor_name": "Doctor Name or Registration number",
  "facility_or_lab": "Hospital Name",
  "patient_notes": "Patient demographics, symptoms, diagnosis, vitals, fluid intake instructions",
  "medicines": [
    {{
      "name": "Medicine / fluid / salt name",
      "dosage": "Dosage / strength",
      "frequency": "Frequency",
      "duration": "Duration",
      "conditionTag": "GENERAL CARE"
    }}
  ]
}}
Respond with pure JSON only."""

payload = {
    'model': 'qwen2.5:7b',
    'messages': [
        {'role': 'system', 'content': 'You are a clinical AI pharmacist. Output pure JSON only.'},
        {'role': 'user', 'content': prompt}
    ],
    'stream': False
}

req = urllib.request.Request(
    'http://localhost:11434/api/chat',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req, timeout=30) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print("OUTPUT FROM LOCAL QWEN2.5:7B:")
    print(res['message']['content'])
