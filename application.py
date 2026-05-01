from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# CO threshold (ppm) - change this value to adjust sensitivity
CO_THRESHOLD = 0.5

class SensorInput(BaseModel):
    temperature: float
    humidity: float
    aqi: float

@app.get("/")
def root():
    return {"message": "Prediction API is running"}

@app.post("/predict")
def predict(data: SensorInput):
    # Generate a test CO value (replace with actual model prediction later)
    predicted_co = 0.0031
    
    return {
        "temperature": data.temperature,
        "humidity": data.humidity,
        "aqi": data.aqi,
        "predicted_co": predicted_co,
        "hazardous": predicted_co > CO_THRESHOLD
    }