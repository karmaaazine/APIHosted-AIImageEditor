import os
import io
import torch
import time
import gc
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline variables
pipe_inpaint = None  # For inpainting and erasing
pipe_generate = None  # For text-to-image generation

# Default prompts for better results
DEFAULT_INPAINT_PROMPT = "high quality, detailed, photorealistic, natural lighting, sharp focus, professional photography"
DEFAULT_INPAINT_NEGATIVE = "blurry, low quality, distorted, artifacts, bad anatomy, deformed, watermark, text, signature, duplicate, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck"

DEFAULT_ERASE_PROMPT = "clean background, natural environment, seamless, realistic, high quality, detailed, photorealistic, natural lighting, sharp focus, smooth texture, coherent background"
DEFAULT_ERASE_NEGATIVE = "objects, items, people, text, watermark, logo, signature, artifacts, distorted, unrealistic, inconsistent, blurry, low quality, bad quality, jpeg artifacts, noise, grain, duplicate, cropped, out of frame, worst quality, low quality, ugly, deformed, mutation, extra elements, foreign objects"

DEFAULT_GENERATE_PROMPT = "masterpiece, best quality, ultra-detailed, photorealistic, 8k uhd, high resolution, absurdres, perfect anatomy, beautiful detailed eyes, professional photography"
DEFAULT_GENERATE_NEGATIVE = "bad hands, bad anatomy, ugly, deformed, face asymmetry, eyes asymmetry, deformed eyes, deformed mouth, open mouth, bad teeth, blur, blurry, low quality, worst quality, low resolution, bad proportions, extra limbs, extra fingers, missing fingers, wrong anatomy, malformed, mutation, mutated, disfigured, distorted, jpeg artifacts, signature, watermark, username, text"

# GPU Memory Monitoring Functions
def get_gpu_memory_info():
    """Get comprehensive GPU memory information"""
    if not torch.cuda.is_available():
        return {
            "cuda_available": False,
            "total_memory": 0,
            "allocated_memory": 0,
            "cached_memory": 0,
            "free_memory": 0,
            "utilization_percent": 0
        }
    
    # Get memory info
    total_memory = torch.cuda.get_device_properties(0).total_memory
    allocated_memory = torch.cuda.memory_allocated(0)
    cached_memory = torch.cuda.memory_reserved(0)
    free_memory = total_memory - cached_memory
    
    return {
        "cuda_available": True,
        "total_memory": total_memory,
        "allocated_memory": allocated_memory,
        "cached_memory": cached_memory,
        "free_memory": free_memory,
        "utilization_percent": round((cached_memory / total_memory) * 100, 2),
        "total_memory_gb": round(total_memory / (1024**3), 2),
        "allocated_memory_gb": round(allocated_memory / (1024**3), 2),
        "cached_memory_gb": round(cached_memory / (1024**3), 2),
        "free_memory_gb": round(free_memory / (1024**3), 2)
    }

def log_gpu_memory(prefix: str, endpoint: str = ""):
    """Log GPU memory usage with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    memory_info = get_gpu_memory_info()
    
    if memory_info["cuda_available"]:
        print(f"\n🔥 [{timestamp}] {prefix} - {endpoint}")
        print(f"   💾 GPU Memory: {memory_info['cached_memory_gb']:.2f}GB / {memory_info['total_memory_gb']:.2f}GB ({memory_info['utilization_percent']:.1f}%)")
        print(f"   📊 Allocated: {memory_info['allocated_memory_gb']:.2f}GB | Free: {memory_info['free_memory_gb']:.2f}GB")
    else:
        print(f"\n💻 [{timestamp}] {prefix} - {endpoint} (CPU Mode)")

def cleanup_gpu_memory():
    """Clean up GPU memory after operations"""
    if torch.cuda.is_available():
        # Clear cache
        torch.cuda.empty_cache()
        # Garbage collection
        gc.collect()

# Memory monitoring middleware
@app.middleware("http")
async def monitor_gpu_memory(request: Request, call_next):
    """Middleware to monitor GPU memory usage for each request"""
    
    # Skip monitoring for health checks and root endpoint
    if request.url.path in ["/", "/health", "/docs", "/redoc", "/openapi.json"]:
        response = await call_next(request)
        return response
    
    # Log memory before request
    endpoint = request.url.path
    log_gpu_memory("🚀 REQUEST START", endpoint)
    
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Clean up and log memory after request
    cleanup_gpu_memory()
    
    end_time = time.time()
    processing_time = round(end_time - start_time, 2)
    
    log_gpu_memory(f"✅ REQUEST COMPLETE ({processing_time}s)", endpoint)
    
    return response

@app.on_event("startup")
async def startup_event():
    """Initialize the RealVisXL models for all tasks"""
    global pipe_inpaint, pipe_generate
    try:
        print("\n🚀 Starting AI Image Editor API...")
        log_gpu_memory("STARTUP - Before model loading")
        
        # Load inpainting pipeline for inpainting and erasing
        print("Loading RealVisXL_V5.0 for inpainting...")
        pipe_inpaint = AutoPipelineForInpainting.from_pretrained(
            "SG161222/RealVisXL_V5.0",
            torch_dtype=torch.float16,
            variant="fp16"
        )
        
        # Load text-to-image pipeline for generation
        print("Loading RealVisXL_V5.0 for text-to-image...")
        pipe_generate = StableDiffusionXLPipeline.from_pretrained(
            "SG161222/RealVisXL_V5.0",
            torch_dtype=torch.float16,
            variant="fp16"
        )
        
        if torch.cuda.is_available():
            pipe_inpaint.to("cuda")
            pipe_generate.to("cuda")
            print("✅ RealVisXL models loaded on CUDA")
        else:
            print("⚠️  CUDA not available, using CPU")
            
        log_gpu_memory("STARTUP - After model loading")
        print("🎉 RealVisXL models loaded successfully!")
        
    except Exception as e:
        print(f"❌ Error loading models: {e}")

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
    """Check if the models are loaded and ready"""
    global pipe_inpaint, pipe_generate
    memory_info = get_gpu_memory_info()
    
    models_loaded = pipe_inpaint is not None and pipe_generate is not None
    
    return {
        "status": "ok" if models_loaded else "models_not_loaded",
        "inpaint_model_loaded": pipe_inpaint is not None,
        "generate_model_loaded": pipe_generate is not None,
        "model_name": "RealVisXL_V5.0",
        "cuda_available": torch.cuda.is_available(),
        "gpu_memory": memory_info,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/gpu-status")
async def gpu_status():
    """Get detailed GPU memory status"""
    memory_info = get_gpu_memory_info()
    return {
        "gpu_memory": memory_info,
        "timestamp": datetime.now().isoformat()
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
    """Perform inpainting on the provided image using the mask and prompt"""
    global pipe_inpaint
    
    if pipe_inpaint is None:
        raise HTTPException(status_code=500, detail="Inpainting model not loaded")
    
    try:
        # Log before processing
        print(f"🎨 Inpainting: '{prompt[:50]}...' | Steps: {num_inference_steps} | Guidance: {guidance_scale}")
        
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
        
        # Resize images (1024x1024 is optimal for SDXL)
        target_size = (1024, 1024)
        input_image = input_image.resize(target_size)
        mask_image = mask_image.resize(target_size)
        
        # Enhance prompt
        enhanced_prompt = f"{prompt}, {DEFAULT_INPAINT_PROMPT}"
        
        # Log GPU memory before inference
        log_gpu_memory("⚙️  Starting inference", "INPAINT")
        
        # Perform inpainting
        result = pipe_inpaint(
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
        
        # Get final memory info
        final_memory = get_gpu_memory_info()
        
        return JSONResponse(content={
            "success": True,
            "result_image": result_base64,
            "prompt": enhanced_prompt,
            "parameters": {
                "num_inference_steps": num_inference_steps,
                "guidance_scale": guidance_scale,
                "strength": strength
            },
            "gpu_memory": final_memory,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error during inpainting: {e}")
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
    """Erase objects from the image by replacing masked areas with appropriate background"""
    global pipe_inpaint
    
    if pipe_inpaint is None:
        raise HTTPException(status_code=500, detail="Inpainting model not loaded")
    
    try:
        # Log before processing
        bg_text = background_prompt[:30] + "..." if len(background_prompt) > 30 else background_prompt
        print(f"🗑️  Erasing object | Background: '{bg_text}' | Steps: {num_inference_steps}")
        
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
        
        # Resize images
        target_size = (1024, 1024)
        input_image = input_image.resize(target_size)
        mask_image = mask_image.resize(target_size)
        
        # Create prompt for erasing
        if background_prompt.strip():
            enhanced_prompt = f"{background_prompt}, {DEFAULT_ERASE_PROMPT}"
        else:
            enhanced_prompt = DEFAULT_ERASE_PROMPT
        
        # Log GPU memory before inference
        log_gpu_memory("⚙️  Starting inference", "ERASE")
        
        # Perform object removal
        result = pipe_inpaint(
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
        
        # Get final memory info
        final_memory = get_gpu_memory_info()
        
        return JSONResponse(content={
            "success": True,
            "result_image": result_base64,
            "prompt": enhanced_prompt,
            "operation": "object_removal",
            "parameters": {
                "num_inference_steps": num_inference_steps,
                "guidance_scale": guidance_scale,
                "strength": strength
            },
            "gpu_memory": final_memory,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error during object removal: {e}")
        raise HTTPException(status_code=500, detail=f"Object removal failed: {str(e)}")

@app.post("/generate")
async def generate_image(
    prompt: str = Form(...),
    negative_prompt: str = Form(DEFAULT_GENERATE_NEGATIVE),
    num_inference_steps: int = Form(25),
    guidance_scale: float = Form(7.0),
    width: int = Form(1024),
    height: int = Form(1024)
):
    """Generate image from text prompt using RealVisXL"""
    global pipe_generate
    
    if pipe_generate is None:
        raise HTTPException(status_code=500, detail="Text-to-image model not loaded")
    
    try:
        # Log before processing
        print(f"🎨 Generating: '{prompt[:50]}...' | {width}x{height} | Steps: {num_inference_steps}")
        
        # Enhance prompt
        enhanced_prompt = f"{prompt}, {DEFAULT_GENERATE_PROMPT}"
        
        # Log GPU memory before inference
        log_gpu_memory("⚙️  Starting inference", "GENERATE")
        
        # Generate image (text-to-image)
        result = pipe_generate(
            prompt=enhanced_prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            width=width,
            height=height
        ).images[0]
        
        # Convert result to base64
        result_base64 = image_to_base64(result)
        
        # Get final memory info
        final_memory = get_gpu_memory_info()
        
        return JSONResponse(content={
            "success": True,
            "result_image": result_base64,
            "prompt": enhanced_prompt,
            "parameters": {
                "num_inference_steps": num_inference_steps,
                "guidance_scale": guidance_scale,
                "width": width,
                "height": height
            },
            "gpu_memory": final_memory,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Error during image generation: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)