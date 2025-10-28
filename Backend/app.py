# backend/app.py
from fastapi import FastAPI, File, UploadFile
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import io
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Permitir todos los orígenes (para desarrollo)
origins = ["*"]  # ⚠️ en producción restringe a tu frontend real

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # lista de orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],          # GET, POST, etc.
    allow_headers=["*"],          # Headers permitidos
)




# ==============================
# 1. Clases del modelo
# ==============================
class_names = ['Mild Dementia', 'Moderate Dementia', 'Non Demented', 'Very mild Dementia']

# ==============================
# 2. Cargar modelo TorchScript
# ==============================

device = torch.device("cpu")
model = torch.jit.load("modelo_resonancias_traced.pt", map_location=device)
model.eval()


# ==============================
# 3. Transformaciones (igual que en entrenamiento)
# ==============================
transform = transforms.Compose([
    transforms.Resize((128,128)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5,0.5,0.5], std=[0.5,0.5,0.5])
])

# ==============================
# 4. Endpoint de predicción
# ==============================
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Leer imagen
    img_bytes = await file.read()
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img = transform(img).unsqueeze(0)  # batch=1

    # Predicción
    with torch.no_grad():
        outputs = model(img)
        _, predicted = torch.max(outputs, 1)
        predicted_class = class_names[predicted.item()]
    

    print(f"Predicted class: {predicted_class}")

    return {"prediction": predicted_class}
