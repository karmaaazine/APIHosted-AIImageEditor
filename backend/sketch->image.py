import os
import torch
import psutil
import time
import threading
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from diffusers import StableDiffusionXLImg2ImgPipeline, DDIMScheduler
from PIL import Image
import numpy as np
import uvicorn
from typing import Optional
import uuid

app = FastAPI(title="Stable Diffusion XL Img2Img API")

# Initialize global variables for models
pipe = None

# GPU monitoring variables
monitoring_active = False
monitoring_thread = None

# Model paths and configuration
MODEL_ID = "SG161222/RealVisXL_V5"

def get_gpu_memory_info():
    """Get GPU memory usage information"""
    if not torch.cuda.is_available():
        return {"error": "CUDA not available"}
    
    info = {}
    for i in range(torch.cuda.device_count()):
        device = torch.device(f'cuda:{i}')
        memory_allocated = torch.cuda.memory_allocated(device) / (1024 ** 3)  # GB
        memory_reserved = torch.cuda.memory_reserved(device) / (1024 ** 3)    # GB
        memory_max_allocated = torch.cuda.max_memory_allocated(device) / (1024 ** 3)  # GB
        
        info[f"cuda:{i}"] = {
            "allocated_GB": round(memory_allocated, 2),
            "reserved_GB": round(memory_reserved, 2),
            "max_allocated_GB": round(memory_max_allocated, 2),
        }
    
    return info

def get_system_memory_info():
    """Get system memory usage information"""
    memory = psutil.virtual_memory()
    return {
        "total_GB": round(memory.total / (1024 ** 3), 2),
        "available_GB": round(memory.available / (1024 ** 3), 2),
        "used_GB": round(memory.used / (1024 ** 3), 2),
        "percent_used": memory.percent
    }

def monitor_resources():
    """Monitor GPU and system resources periodically"""
    global monitoring_active
    
    while monitoring_active:
        gpu_info = get_gpu_memory_info()
        sys_info = get_system_memory_info()
        
        print("\n===== Resource Monitor =====")
        print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Print GPU info
        if "error" in gpu_info:
            print(f"GPU: {gpu_info['error']}")
        else:
            for device, info in gpu_info.items():
                print(f"GPU {device}:")
                print(f"  - Allocated: {info['allocated_GB']} GB")
                print(f"  - Reserved:  {info['reserved_GB']} GB")
                print(f"  - Max Used:  {info['max_allocated_GB']} GB")
        
        # Print system memory info
        print("\nSystem Memory:")
        print(f"  - Total:     {sys_info['total_GB']} GB")
        print(f"  - Available: {sys_info['available_GB']} GB")
        print(f"  - Used:      {sys_info['used_GB']} GB ({sys_info['percent_used']}%)")
        print("============================\n")
        
        time.sleep(10)  # Update every 10 seconds

def start_monitoring():
    """Start the resource monitoring thread"""
    global monitoring_active, monitoring_thread
    
    if monitoring_thread is None or not monitoring_thread.is_alive():
        monitoring_active = True
        monitoring_thread = threading.Thread(target=monitor_resources, daemon=True)
        monitoring_thread.start()
        print("Resource monitoring started.")
    else:
        print("Resource monitoring is already active.")

def stop_monitoring():
    """Stop the resource monitoring thread"""
    global monitoring_active
    
    monitoring_active = False
    print("Resource monitoring stopped.")

def initialize_models():
    global pipe
    
    # Clear CUDA cache before loading models
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    # Load SDXL Img2Img pipeline
    pipe = StableDiffusionXLImg2ImgPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True
    )
    
    # Use DDIM scheduler for better results
    pipe.scheduler = DDIMScheduler.from_config(pipe.scheduler.config)
    
    # Move to GPU if available
    if torch.cuda.is_available():
        pipe = pipe.to("cuda")

@app.on_event("startup")
async def startup_event():
    print(f"\n{'='*50}")
    print(f"Starting server at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*50}\n")
    # Start GPU monitoring
    start_monitoring()
    
    # Print initial GPU state
    print("\n===== Initial GPU State =====")
    gpu_info = get_gpu_memory_info()
    if "error" in gpu_info:
        print(f"GPU: {gpu_info['error']}")
    else:
        for device, info in gpu_info.items():
            print(f"GPU {device}: {info}")
    print("============================\n")
    
    # Initialize models
    initialize_models()
    
    # Print GPU state after model loading
    print("\n===== GPU State After Model Loading =====")
    gpu_info = get_gpu_memory_info()
    if "error" in gpu_info:
        print(f"GPU: {gpu_info['error']}")
    else:
        for device, info in gpu_info.items():
            print(f"GPU {device}: {info}")
    print("=========================================\n")

@app.post("/generate/")
async def generate_image(
    prompt: str = Form(...),
    negative_prompt: str = Form(""),
    sketch: UploadFile = File(...),
    seed: Optional[int] = Form(None),
    num_inference_steps: int = Form(20),
    guidance_scale: float = Form(8.0),
    strength: float = Form(0.75),
):
    """Generate an image using SDXL Img2Img"""
    try:
        # Print GPU state before generation
        print("\n===== GPU State Before Generation =====")
        gpu_info = get_gpu_memory_info()
        if "error" not in gpu_info:
            for device, info in gpu_info.items():
                print(f"GPU {device}: {info}")
        print("=====================================\n")
        
        # Clear CUDA cache before processing
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        # Save uploaded image temporarily
        temp_image_path = f"temp_{uuid.uuid4()}.png"
        with open(temp_image_path, "wb") as buffer:
            buffer.write(await sketch.read())
        
        # Load and resize the sketch image
        control_image = Image.open(temp_image_path).convert("RGB").resize((1024, 1024))
        
        # Set random seed if not provided
        if seed is None:
            seed = torch.randint(0, 2**32, (1,)).item()
        
        # Set the generator for reproducibility
        generator = torch.Generator(device="cuda" if torch.cuda.is_available() else "cpu").manual_seed(seed)
        
        # Generate image
        output = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=control_image,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            strength=strength,
            generator=generator,
        )
        
        # Save the generated image
        output_path = f"output_{uuid.uuid4()}.png"
        output.images[0].save(output_path)
        
        # Clean up temporary files
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)
        
        # Print GPU state after generation
        print("\n===== GPU State After Generation =====")
        gpu_info = get_gpu_memory_info()
        if "error" not in gpu_info:
            for device, info in gpu_info.items():
                print(f"GPU {device}: {info}")
        print("====================================\n")
        
        # Return the image
        return FileResponse(output_path, media_type="image/png", filename="generated_image.png")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating image: {str(e)}")
    
    finally:
        # Clean up temporary files
        if 'temp_image_path' in locals() and os.path.exists(temp_image_path):
            os.remove(temp_image_path)

@app.on_event("shutdown")
async def shutdown_event():
    print(f"\n{'='*50}")
    print(f"Shutting down server at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Stop monitoring
    stop_monitoring()
    
    # Final GPU state
    print("\n===== Final GPU State =====")
    gpu_info = get_gpu_memory_info()
    if "error" not in gpu_info:
        for device, info in gpu_info.items():
            print(f"GPU {device}: {info}")
    print("==========================\n")
    print(f"{'='*50}\n")

# API endpoint to get current GPU status
@app.get("/gpu-status/")
async def get_gpu_status():
    """Get current GPU memory usage"""
    return {
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "gpu": get_gpu_memory_info(),
        "system_memory": get_system_memory_info()
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)