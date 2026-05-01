import os
import json
import time
import boto3
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# Configuration from environment variables
CO_THRESHOLD = float(os.getenv("CO_THRESHOLD", "0.5"))
ALERTS_ENABLED = os.getenv("ALERTS_ENABLED", "true").lower() == "true"
ALERT_COOLDOWN_SEC = int(os.getenv("ALERT_COOLDOWN_SEC", "300"))
SNS_TOPIC_ARN = os.getenv("SNS_TOPIC_ARN", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")

# Initialize SNS client if topic ARN is configured
sns_client = None
if SNS_TOPIC_ARN and ALERTS_ENABLED:
    sns_client = boto3.client("sns", region_name=AWS_REGION)

_last_alert_ts = 0.0

class SensorInput(BaseModel):
    temperature: float
    humidity: float
    aqi: float

def publish_danger_alert(payload: dict) -> None:
    """Publish alert to SNS topic with cooldown to prevent spam"""
    global _last_alert_ts
    
    if not ALERTS_ENABLED or not SNS_TOPIC_ARN or sns_client is None:
        return

    now = time.time()
    if now - _last_alert_ts < ALERT_COOLDOWN_SEC:
        return  # Cooldown not expired, skip alert

    try:
        sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject="⚠️ ENV MONITOR ALERT: CO HAZARD DETECTED",
            Message=json.dumps(payload, indent=2)
        )
        _last_alert_ts = now
        print(f"Alert published at {time.ctime()}")
    except Exception as e:
        print(f"Error publishing alert: {e}")

@app.get("/")
def root():
    return {"message": "Prediction API is running"}

@app.post("/predict")
def predict(data: SensorInput):
    # Generate CO prediction (replace with actual model prediction later)
    predicted_co = 0.0031
    hazardous = predicted_co > CO_THRESHOLD

    result = {
        "temperature": data.temperature,
        "humidity": data.humidity,
        "aqi": data.aqi,
        "predicted_co": predicted_co,
        "hazardous": hazardous
    }

    # Publish SNS alert if hazardous
    if hazardous:
        publish_danger_alert(result)

    return result