#!/bin/bash

echo "🚀 Starting AI Image Editor API..."
echo "📝 Powered by RealVisXL_V5.0 - Professional AI Image Editing"
echo ""

# Check Python version
python_version=$(python3 --version 2>&1 | grep -oP '(?<=Python )\d+\.\d+' || echo "unknown")
echo "🐍 Python version: $python_version"

# Check if CUDA is available
if command -v nvidia-smi &> /dev/null; then
    echo "🎮 GPU Status:"
    nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv,noheader,nounits | while read line; do
        echo "   📱 $line"
    done
else
    echo "⚠️  No NVIDIA GPU detected - will run on CPU (slower)"
fi

echo ""
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "🤖 Checking and downloading AI models..."
echo "   📥 This may take 5-15 minutes on first run (~6GB download)"
echo "   💾 Models will be cached for future use"
echo ""

# Create a Python script to download and verify models
cat > download_models.py << 'EOF'
import sys
import torch
from diffusers import AutoPipelineForInpainting, StableDiffusionXLPipeline
from huggingface_hub import snapshot_download
import os

MODEL_NAME = "SG161222/RealVisXL_V5.0"
MODEL_CONFIG = {
    "torch_dtype": torch.float16,
    "variant": "fp16"
}

def check_disk_space():
    """Check if we have enough disk space for the model"""
    try:
        import shutil
        total, used, free = shutil.disk_usage('/')
        free_gb = free // (1024**3)
        print(f"   💽 Available disk space: {free_gb}GB")
        if free_gb < 10:
            print(f"   ⚠️  Warning: Low disk space. Need ~10GB free, have {free_gb}GB")
            return False
        return True
    except Exception as e:
        print(f"   ⚠️  Could not check disk space: {e}")
        return True

def download_model_files():
    """Download model files using huggingface_hub for better progress tracking"""
    try:
        print(f"   📥 Downloading {MODEL_NAME}...")
        
        # Download model files with progress
        cache_dir = snapshot_download(
            repo_id=MODEL_NAME,
            cache_dir=None,  # Use default cache
            local_files_only=False,
            revision=None
        )
        
        print(f"   ✅ Model files downloaded to: {cache_dir}")
        return True
        
    except Exception as e:
        print(f"   ❌ Error downloading model files: {e}")
        return False

def verify_inpainting_pipeline():
    """Verify inpainting pipeline can be loaded"""
    try:
        print("   🔧 Verifying inpainting pipeline...")
        
        # Try to load without moving to GPU to save memory during verification
        pipe = AutoPipelineForInpainting.from_pretrained(
            MODEL_NAME,
            **MODEL_CONFIG,
            device_map=None  # Don't auto-assign to GPU yet
        )
        
        print("   ✅ Inpainting pipeline verified")
        del pipe  # Free memory
        return True
        
    except Exception as e:
        print(f"   ❌ Error verifying inpainting pipeline: {e}")
        return False

def verify_text2img_pipeline():
    """Verify text-to-image pipeline can be loaded"""
    try:
        print("   🔧 Verifying text-to-image pipeline...")
        
        # Try to load without moving to GPU
        pipe = StableDiffusionXLPipeline.from_pretrained(
            MODEL_NAME,
            **MODEL_CONFIG,
            device_map=None  # Don't auto-assign to GPU yet
        )
        
        print("   ✅ Text-to-image pipeline verified")
        del pipe  # Free memory
        return True
        
    except Exception as e:
        print(f"   ❌ Error verifying text-to-image pipeline: {e}")
        return False

def main():
    print("🤖 AI Model Download and Verification")
    print(f"   📋 Model: {MODEL_NAME}")
    print(f"   🔧 Config: {MODEL_CONFIG}")
    print("")
    
    # Check disk space
    if not check_disk_space():
        print("   ⚠️  Proceeding anyway, but monitor disk space...")
    
    # Download model files first
    print("📥 Step 1: Downloading model files...")
    if not download_model_files():
        print("❌ Failed to download model files")
        sys.exit(1)
    
    print("")
    print("🔧 Step 2: Verifying pipelines...")
    
    # Verify inpainting pipeline
    if not verify_inpainting_pipeline():
        print("❌ Failed to verify inpainting pipeline")
        sys.exit(1)
    
    # Clear any cached models and verify text-to-image
    torch.cuda.empty_cache() if torch.cuda.is_available() else None
    
    if not verify_text2img_pipeline():
        print("❌ Failed to verify text-to-image pipeline")
        sys.exit(1)
    
    # Final cleanup
    torch.cuda.empty_cache() if torch.cuda.is_available() else None
    
    print("")
    print("🎉 All models downloaded and verified successfully!")
    print("   💾 Models are cached and ready for use")
    print("   🚀 API startup will now be much faster")
    
if __name__ == "__main__":
    main()
EOF

# Run the model download script
echo "🔄 Running model download and verification..."
python download_models.py

# Check if download was successful
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Model download failed!"
    echo "   🔧 Troubleshooting tips:"
    echo "   • Check internet connection"
    echo "   • Verify HuggingFace Hub access"
    echo "   • Ensure sufficient disk space (~10GB)"
    echo "   • Try running: pip install --upgrade diffusers transformers"
    echo ""
    echo "🔄 Starting API anyway (models will download on first request)..."
else
    echo ""
    echo "✅ Models ready! Starting API server..."
fi

# Clean up download script
rm -f download_models.py

echo ""
echo "🔥 Features Available:"
echo "   🎨 AI Inpainting - Replace/modify objects in images"
echo "   🗑️  Object Removal - Seamlessly erase unwanted objects"
echo "   ✨ Text-to-Image - Generate images from text prompts"
echo ""
echo "💡 Memory Optimization:"
echo "   • Models load on-demand to optimize GPU memory"
echo "   • Smart unloading prevents CUDA OOM errors"
echo "   • Real-time memory monitoring included"
echo ""
echo "🌐 API will be available at: http://localhost:8000"
echo "📖 API docs will be at: http://localhost:8000/docs"
echo ""
echo "⏳ Starting FastAPI server..."
echo "   (Models are pre-downloaded, first request should be fast!)"
echo ""

python main.py