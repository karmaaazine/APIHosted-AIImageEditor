import os
import io
import torch
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import base64
from typing import Optional
from diffusers import AutoPipelineForInpainting

app = FastAPI(title="SDXL Inpainting API", version="2.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000"
    ],  # Allow all common frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline variable
pipe = None

@app.on_event("startup")
async def startup_event():
    """Initialize the SDXL Inpainting pipeline on startup"""
    global pipe
    try:
        print("Loading SDXL Inpainting model (1024x1024)...")
        pipe = AutoPipelineForInpainting.from_pretrained(
            "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
            torch_dtype=torch.float16,
            variant="fp16"
        )
        
        # Move to CUDA if available
        if torch.cuda.is_available():
            pipe.to("cuda")
            print("SDXL model loaded on CUDA")
        else:
            print("CUDA not available, using CPU")
            
        print("SDXL model loaded successfully!")
        
    except Exception as e:
        print(f"Error loading SDXL model: {e}")
        # Continue startup even if model fails to load for development

def image_to_base64(image: Image.Image) -> str:
    """Convert PIL Image to base64 string"""
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return img_str

def base64_to_image(base64_string: str) -> Image.Image:
    """Convert base64 string to PIL Image"""
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    return image

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "SDXL Inpainting API is running"}

@app.get("/health")
async def health_check():
    """Check if the model is loaded and ready"""
    global pipe
    return {
        "status": "ok" if pipe is not None else "model_not_loaded",
        "cuda_available": torch.cuda.is_available(),
        "model_loaded": pipe is not None
    }

@app.post("/inpaint")
async def inpaint_image(
    prompt: str = Form(...),
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    negative_prompt: str = Form("blurry, low quality, distorted, artifacts, bad anatomy"),
    num_inference_steps: int = Form(20),
    guidance_scale: float = Form(8.0),
    strength: float = Form(0.99)
):
    """
    Perform inpainting on the provided image using the mask and prompt
    """
    global pipe
    
    if pipe is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Validate file types
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Image file must be an image")
        if not mask.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Mask file must be an image")
        
        # Load images
        image_data = await image.read()
        mask_data = await mask.read()
        
        input_image = Image.open(io.BytesIO(image_data)).convert("RGB")
        mask_image = Image.open(io.BytesIO(mask_data)).convert("RGB")
        
        # Resize images to be compatible (1024x1024 is optimal for SDXL)
        target_size = (1024, 1024)
        input_image = input_image.resize(target_size)
        mask_image = mask_image.resize(target_size)
        
        # Perform inpainting
        print(f"Starting inpainting with prompt: {prompt}")
        print(f"Negative prompt: {negative_prompt}")
        result = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=input_image,
            mask_image=mask_image,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            strength=strength
        ).images[0]
        
        # Convert result to base64
        result_base64 = image_to_base64(result)
        
        return JSONResponse(content={
            "success": True,
            "result_image": result_base64,
            "prompt": prompt,
            "parameters": {
                "num_inference_steps": num_inference_steps,
                "guidance_scale": guidance_scale,
                "strength": strength
            }
        })
        
    except Exception as e:
        print(f"Error during inpainting: {e}")
        raise HTTPException(status_code=500, detail=f"Inpainting failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 