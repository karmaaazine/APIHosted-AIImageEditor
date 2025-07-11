import os
import io
import torch
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import base64
from typing import Optional
from diffusers import AutoPipelineForInpainting, StableDiffusionXLPipeline

app = FastAPI(title="AI Image Editor API", version="2.0.0")

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

# Global pipeline variable - only need ONE model now!
pipe = None

# Default prompts for better results
DEFAULT_INPAINT_PROMPT = "high quality, detailed, photorealistic, natural lighting, sharp focus, professional photography"
DEFAULT_INPAINT_NEGATIVE = "blurry, low quality, distorted, artifacts, bad anatomy, deformed, watermark, text, signature, duplicate, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck"

DEFAULT_ERASE_PROMPT = "clean background, natural environment, seamless, realistic, high quality, detailed, photorealistic, natural lighting, sharp focus, smooth texture, coherent background"
DEFAULT_ERASE_NEGATIVE = "objects, items, people, text, watermark, logo, signature, artifacts, distorted, unrealistic, inconsistent, blurry, low quality, bad quality, jpeg artifacts, noise, grain, duplicate, cropped, out of frame, worst quality, low quality, ugly, deformed, mutation, extra elements, foreign objects"

# RealVisXL optimized prompts for text-to-image generation
DEFAULT_GENERATE_PROMPT = "masterpiece, best quality, ultra-detailed, photorealistic, 8k uhd, high resolution, absurdres, perfect anatomy, beautiful detailed eyes, professional photography"
DEFAULT_GENERATE_NEGATIVE = "bad hands, bad anatomy, ugly, deformed, face asymmetry, eyes asymmetry, deformed eyes, deformed mouth, open mouth, bad teeth, blur, blurry, low quality, worst quality, low resolution, bad proportions, extra limbs, extra fingers, missing fingers, wrong anatomy, malformed, mutation, mutated, disfigured, distorted, jpeg artifacts, signature, watermark, username, text"

@app.on_event("startup")
async def startup_event():
    """Initialize the RealVisXL model for both text-to-image and inpainting"""
    global pipe
    try:
        print("Loading RealVisXL_V5.0 model for all tasks (1024x1024)...")
        
        # Load RealVisXL with AutoPipelineForInpainting - works for both!
        pipe = AutoPipelineForInpainting.from_pretrained(
            "SG161222/RealVisXL_V5.0",
            torch_dtype=torch.float16,
            variant="fp16"
        )
        
        # Move to CUDA if available
        if torch.cuda.is_available():
            pipe.to("cuda")
            print("RealVisXL model loaded on CUDA")
        else:
            print("CUDA not available, using CPU")
            
        print("RealVisXL model loaded successfully for all tasks!")
        
    except Exception as e:
        print(f"Error loading model: {e}")

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
    return {"message": "AI Image Editor API with RealVisXL is running"}

@app.get("/health")
async def health_check():
    """Check if the model is loaded and ready"""
    global pipe
    return {
        "status": "ok" if pipe is not None else "model_not_loaded",
        "cuda_available": torch.cuda.is_available(),
        "model_loaded": pipe is not None,
        "model_name": "RealVisXL_V5.0"
    }

@app.post("/inpaint")
async def inpaint_image(
    prompt: str = Form(...),
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    negative_prompt: str = Form(DEFAULT_INPAINT_NEGATIVE),
    num_inference_steps: int = Form(25),
    guidance_scale: float = Form(7.5),
    strength: float = Form(0.99)
):
    """
    Perform inpainting on the provided image using the mask and prompt
    """
    global pipe
    
    if pipe is None:
        raise HTTPException(status_code=500, detail="Inpainting model not loaded")
    
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
        
        # Enhance prompt with default quality terms
        enhanced_prompt = f"{prompt}, {DEFAULT_INPAINT_PROMPT}"
        
        # Perform inpainting
        print(f"Starting inpainting with prompt: {enhanced_prompt}")
        print(f"Negative prompt: {negative_prompt}")
        result = pipe(
            prompt=enhanced_prompt,
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
            "prompt": enhanced_prompt,
            "parameters": {
                "num_inference_steps": num_inference_steps,
                "guidance_scale": guidance_scale,
                "strength": strength
            }
        })
        
    except Exception as e:
        print(f"Error during inpainting: {e}")
        raise HTTPException(status_code=500, detail=f"Inpainting failed: {str(e)}")

@app.post("/erase")
async def erase_object(
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    background_prompt: str = Form(""),
    negative_prompt: str = Form(DEFAULT_ERASE_NEGATIVE),
    num_inference_steps: int = Form(30),
    guidance_scale: float = Form(7.5),
    strength: float = Form(0.99)
):
    """
    Erase objects from the image by replacing masked areas with appropriate background
    """
    global pipe
    
    if pipe is None:
        raise HTTPException(status_code=500, detail="Inpainting model not loaded")
    
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
        
        # Create prompt for erasing (background generation)
        if background_prompt.strip():
            enhanced_prompt = f"{background_prompt}, {DEFAULT_ERASE_PROMPT}"
        else:
            enhanced_prompt = DEFAULT_ERASE_PROMPT
        
        # Perform object removal via inpainting with background-focused prompt
        print(f"Starting object erasure with prompt: {enhanced_prompt}")
        print(f"Negative prompt: {negative_prompt}")
        result = pipe(
            prompt=enhanced_prompt,
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
            "prompt": enhanced_prompt,
            "operation": "erase",
            "parameters": {
                "num_inference_steps": num_inference_steps,
                "guidance_scale": guidance_scale,
                "strength": strength
            }
        })
        
    except Exception as e:
        print(f"Error during object erasure: {e}")
        raise HTTPException(status_code=500, detail=f"Object erasure failed: {str(e)}")

# For text-to-image generation, use the same pipeline:
@app.post("/generate")
async def generate_image(
    prompt: str = Form(...),
    negative_prompt: str = Form(DEFAULT_GENERATE_NEGATIVE),
    num_inference_steps: int = Form(25),
    guidance_scale: float = Form(7.0),
    width: int = Form(1024),
    height: int = Form(1024)
):
    global pipe
    
    if pipe is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # For text-to-image, just call without image/mask
        result = pipe(
            prompt=f"{prompt}, {DEFAULT_GENERATE_PROMPT}",
            negative_prompt=negative_prompt,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            width=width,
            height=height
        ).images[0]
        
        # Convert result to base64
        result_base64 = image_to_base64(result)
        
        return JSONResponse(content={
            "success": True,
            "result_image": result_base64,
            "prompt": f"{prompt}, {DEFAULT_GENERATE_PROMPT}",
            "operation": "generate",
            "parameters": {
                "num_inference_steps": num_inference_steps,
                "guidance_scale": guidance_scale,
                "width": width,
                "height": height
            }
        })
        
    except Exception as e:
        print(f"Error during image generation: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)