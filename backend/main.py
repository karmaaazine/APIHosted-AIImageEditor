import os
import io
import torch
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import base64
from typing import Optional
from diffusers import StableDiffusionInpaintPipeline

app = FastAPI(title="Stable Diffusion Inpainting API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline variable
pipe = None

@app.on_event("startup")
async def startup_event():
    """Initialize the Stable Diffusion pipeline on startup"""
    global pipe
    try:
        print("Loading Stable Diffusion 2 Inpainting model...")
        pipe = StableDiffusionInpaintPipeline.from_pretrained(
            "stabilityai/stable-diffusion-2-inpainting",
            torch_dtype=torch.float16,
        )
        
        # Move to CUDA if available
        if torch.cuda.is_available():
            pipe.to("cuda")
            print("Model loaded on CUDA")
        else:
            print("CUDA not available, using CPU")
            
        print("Model loaded successfully!")
        
    except Exception as e:
        print(f"Error loading model: {e}")
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
    return {"message": "Stable Diffusion Inpainting API is running"}

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
    num_inference_steps: int = Form(50),
    guidance_scale: float = Form(7.5),
    strength: float = Form(1.0)
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
        
        # Resize images to be compatible (512x512 is optimal for SD2)
        target_size = (512, 512)
        input_image = input_image.resize(target_size)
        mask_image = mask_image.resize(target_size)
        
        # Perform inpainting
        print(f"Starting inpainting with prompt: {prompt}")
        result = pipe(
            prompt=prompt,
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