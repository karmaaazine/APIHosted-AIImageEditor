# 🎨 AI Image Editor - Professional AI-Powered Image Tools

A comprehensive AI image editing platform featuring **three powerful tools** powered by **RealVisXL_V5.0**. Create, modify, and enhance images with state-of-the-art AI technology, optimized for professional results and efficient GPU memory usage.

## ✨ Features

### 🔥 **Three AI-Powered Tools**
- **🎨 AI Inpainting**: Replace or modify objects in images with AI-generated content
- **🗑️ Object Removal**: Seamlessly erase unwanted objects from photos  
- **✨ Text-to-Image**: Generate stunning images from text descriptions

### 🚀 **Advanced Capabilities**
- **🖼️ High Resolution**: Native 1024x1024 output with photorealistic quality
- **🎯 Smart Prompting**: Enhanced positive/negative prompts with presets
- **🧠 Memory Efficient**: On-demand model loading prevents CUDA OOM errors
- **📊 Real-time Monitoring**: Live GPU memory usage tracking
- **🖌️ Interactive Tools**: Canvas-based editing with brush controls
- **📱 Modern UI**: Responsive design with warm color scheme
- **⚡ Optimized Performance**: RealVisXL with attention slicing

## 🏗️ Architecture

- **Backend**: FastAPI (Python) with memory-efficient model management
- **Frontend**: Next.js (React/TypeScript) with multi-page routing
- **Model**: RealVisXL_V5.0 (photorealistic SDXL variant)
- **Resolution**: 1024x1024 with multiple aspect ratios
- **Memory**: Smart on-demand loading for GPU optimization

## 📋 System Requirements

### **Backend Requirements**
- **Python**: 3.8+
- **GPU**: CUDA-compatible with 8GB+ VRAM (RTX 3070/4060+ recommended)
- **Storage**: ~15GB free space (for model download)
- **RAM**: 16GB+ system memory

### **Frontend Requirements**
- **Node.js**: 18+
- **Browser**: Modern browser with Canvas API support
- **Network**: Access to backend API (localhost or remote)

### **Supported Platforms**
- ✅ **RunPod**: Optimized for cloud GPU instances
- ✅ **Local GPU**: NVIDIA RTX series
- ✅ **Google Colab**: Pro/Pro+ with GPU runtime
- ⚠️ **CPU Mode**: Functional but very slow (60+ seconds per image)

## 🚀 Quick Start

### **1. Backend Setup**

```bash
# Clone and navigate to backend
cd APIHosted-AIImageEditor/backend

# Install dependencies
pip install -r requirements.txt

# Start the server (with enhanced output)
chmod +x run.sh
./run.sh
```

**Expected startup output:**
```bash
🚀 Starting AI Image Editor API...
📝 Powered by RealVisXL_V5.0 - Professional AI Image Editing

🐍 Python version: 3.10
🎮 GPU Status:
   📱 NVIDIA GeForce RTX 4090, 24576, 1024

🔥 Features Available:
   🎨 AI Inpainting - Replace/modify objects in images
   🗑️  Object Removal - Seamlessly erase unwanted objects  
   ✨ Text-to-Image - Generate images from text prompts

💡 Memory Optimization:
   • Models load on-demand to optimize GPU memory
   • Smart unloading prevents CUDA OOM errors
   • Real-time memory monitoring included

🌐 API will be available at: http://localhost:8000
```

### **2. Frontend Setup**

```bash
# Navigate to frontend
cd APIHosted-AIImageEditor/frontend

# Install dependencies and start
npm install
npm run dev
```

Frontend available at: `http://localhost:3000`

## 🎨 Tool-by-Tool Guide

### **🎨 AI Inpainting (`/inpaint`)**

**Perfect for**: Replacing objects, changing backgrounds, modifying scenes

1. **Upload Image**: Drag & drop your photo
2. **Paint Mask**: Use brush tools to mark areas for modification
3. **Enter Prompt**: Describe what you want to generate
4. **Generate**: AI replaces masked areas with your prompt
5. **Download**: Save your enhanced image

**Example Prompts**:
- `"modern glass building with blue reflective windows"`
- `"vintage leather jacket with silver zippers"`
- `"blooming cherry tree with pink flowers"`

### **🗑️ Object Removal (`/erase`)**

**Perfect for**: Removing people, objects, watermarks, unwanted elements

1. **Upload Image**: Choose photo with unwanted objects
2. **Paint Mask**: Mark exactly what to remove
3. **Background Hint** (optional): Describe desired background
4. **Erase**: AI seamlessly fills the area
5. **Download**: Clean image without objects

**Background Prompts**:
- `"grass field"` (for removing people from parks)
- `"ocean waves"` (for beach cleanup)
- `"empty road"` (for vehicle removal)

### **✨ Text-to-Image (`/generate`)**

**Perfect for**: Creating original images, concept art, illustrations

1. **Enter Prompt**: Describe your desired image
2. **Choose Aspect Ratio**: Square, Portrait, Landscape, Wide
3. **Adjust Settings**: Steps, guidance, advanced options
4. **Generate**: AI creates your image from scratch
5. **Download**: Save your generated artwork

**Effective Prompts**:
- `"A majestic mountain landscape at sunset with dramatic clouds"`
- `"Portrait of a wise old wizard with flowing robes and magical staff"`
- `"Futuristic cyberpunk city with neon lights and flying cars"`

## 🔧 Memory Management

### **Smart Loading System**

The backend uses intelligent model management to prevent CUDA out-of-memory errors:

```python
# Models load only when needed
🎨 Inpainting request → Loads inpainting model (unloads others)
🗑️ Erase request → Uses same inpainting model  
✨ Generate request → Loads text-to-image model (unloads others)
```

### **Memory Monitoring**

Real-time GPU tracking in console and API responses:

```bash
🔥 [2024-01-15 14:30:25] 🚀 REQUEST START - /generate
   💾 GPU Memory: 3.2GB / 24.0GB (13.3%)
   📊 Allocated: 2.8GB | Free: 20.8GB

🔥 [2024-01-15 14:30:35] ✅ REQUEST COMPLETE (10.2s) - /generate
   💾 GPU Memory: 3.1GB / 24.0GB (12.9%)
   📊 Allocated: 2.7GB | Free: 20.9GB
```

### **Memory Optimization Features**

- **On-demand loading**: Models load only when requested
- **Smart unloading**: Previous model cleared before loading new one
- **Attention slicing**: Reduces memory usage during inference
- **VAE slicing**: Further memory optimization for large images
- **Aggressive cleanup**: GPU cache cleared after each request

## 🔌 API Endpoints

### **Core Endpoints**

| Endpoint | Method | Purpose | Model Used |
|----------|--------|---------|------------|
| `/inpaint` | POST | AI inpainting | RealVisXL Inpainting |
| `/erase` | POST | Object removal | RealVisXL Inpainting |
| `/generate` | POST | Text-to-image | RealVisXL Text-to-Image |
| `/health` | GET | System status | None |
| `/gpu-status` | GET | Memory monitoring | None |

### **Example API Calls**

**Inpainting**:
```bash
curl -X POST "http://localhost:8000/inpaint" \
  -F "image=@photo.jpg" \
  -F "mask=@mask.png" \
  -F "prompt=beautiful sunset sky with clouds" \
  -F "negative_prompt=blurry, low quality" \
  -F "num_inference_steps=25" \
  -F "guidance_scale=7.5"
```

**Text-to-Image**:
```bash
curl -X POST "http://localhost:8000/generate" \
  -F "prompt=mountain landscape at sunset" \
  -F "negative_prompt=blurry, low quality" \
  -F "width=1024" \
  -F "height=1024" \
  -F "num_inference_steps=25"
```

## ⚙️ Configuration

### **Backend Configuration**

**Model Settings** (`main.py`):
```python
MODEL_NAME = "SG161222/RealVisXL_V5.0"  # Change model here
MODEL_CONFIG = {
    "torch_dtype": torch.float16,  # Use fp16 for memory efficiency  
    "variant": "fp16"
}
```

**Memory Optimization**:
```python
# Enable in load_*_model() functions
pipe.enable_attention_slicing()  # Reduces memory usage
pipe.enable_vae_slicing()       # Further optimization
```

**CORS Settings** (for different frontend URLs):
```python
allow_origins=[
    "http://localhost:3000",      # Local development
    "http://your-domain.com",     # Production domain
    "https://your-app.vercel.app" # Deployed frontend
]
```

### **Frontend Configuration**

**API Endpoint** (`frontend/src/app/*/page.tsx`):
```typescript
// Update for remote backend
const response = await fetch('http://your-server:8000/generate', {
  method: 'POST',
  body: formData,
})
```

**Environment Variables** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=AI Image Editor
```

## 🔧 Troubleshooting

### **Memory Issues**

**CUDA Out of Memory**:
```bash
✅ Solution: On-demand loading system prevents this
⚠️  If still occurs: Reduce image size or inference steps
🔧 Emergency: Set PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
```

**Model Loading Slow**:
```bash
✅ Expected: First request loads model (30-60 seconds)
✅ Subsequent: Same tool requests are fast
🔧 Optimization: Keep using same tool for batch processing
```

### **Backend Issues**

**Model Download Fails**:
```bash
# Clear cache and retry
rm -rf ~/.cache/huggingface/
pip install --upgrade diffusers transformers
python -c "from diffusers import AutoPipelineForInpainting; AutoPipelineForInpainting.from_pretrained('SG161222/RealVisXL_V5.0')"
```

**API Startup Errors**:
```bash
# Check dependencies
pip install -r requirements.txt --force-reinstall

# Verify Python version  
python3 --version  # Should be 3.8+

# Test imports
python3 -c "import torch; print('CUDA:', torch.cuda.is_available())"
```

### **Frontend Issues**

**Build Errors**:
```bash
# Clean rebuild
rm -rf .next node_modules
npm install
npm run dev
```

**API Connection Issues**:
```bash
# Check backend status
curl http://localhost:8000/health

# Verify CORS settings in main.py
# Update API URL in frontend if needed
```

## 🎯 Performance Optimization

### **Hardware Recommendations**

| GPU Tier | VRAM | Performance | Recommended For |
|-----------|------|-------------|-----------------|
| **RTX 4090** | 24GB | Excellent | Professional use |
| **RTX 4080** | 16GB | Very Good | Prosumer |
| **RTX 3080** | 10GB | Good | Hobbyist |
| **RTX 3070** | 8GB | Adequate | Basic use |

### **Settings for Different Hardware**

**8GB VRAM (Minimum)**:
```python
# Reduce batch size, enable all optimizations
num_inference_steps=20
enable_attention_slicing=True  
enable_vae_slicing=True
```

**16GB+ VRAM (Recommended)**:
```python
# Standard settings work well
num_inference_steps=25
guidance_scale=7.5
```

**24GB+ VRAM (Optimal)**:
```python
# Can handle larger images and higher quality
width=1152, height=1152  # Higher resolution
num_inference_steps=30   # More detailed results
```

### **RunPod Optimization**

**Recommended Instance Types**:
- **RTX A6000** (48GB) - Best value for professional use
- **RTX 4090** (24GB) - Excellent performance/cost ratio  
- **RTX 3090** (24GB) - Good budget option

**RunPod Setup**:
```bash
# In RunPod terminal
git clone https://github.com/your-repo/APIHosted-AIImageEditor.git
cd APIHosted-AIImageEditor/backend
pip install -r requirements.txt
./run.sh

# Access via RunPod's exposed port
# Update frontend to connect to: https://your-pod-id-8000.proxy.runpod.net
```

## 🔒 Production Deployment

### **Security Checklist**

- [ ] **Rate Limiting**: Implement request throttling
- [ ] **Authentication**: Add user authentication system
- [ ] **HTTPS**: Use SSL certificates for secure connections
- [ ] **File Validation**: Restrict upload types and sizes
- [ ] **CORS**: Configure specific allowed origins
- [ ] **Monitoring**: Set up logging and error tracking

### **Docker Deployment**

**Backend Dockerfile**:
```dockerfile
FROM nvidia/cuda:11.8-runtime-ubuntu22.04
RUN apt-get update && apt-get install -y python3 python3-pip
COPY requirements.txt .
RUN pip3 install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python3", "main.py"]
```

**Frontend Dockerfile**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🆘 Support & Community

### **Getting Help**

- **GitHub Issues**: Report bugs and feature requests
- **Model Issues**: Check [RealVisXL_V5.0](https://huggingface.co/SG161222/RealVisXL_V5.0) documentation
- **Diffusers**: [Hugging Face Diffusers](https://huggingface.co/docs/diffusers) documentation
- **FastAPI**: [FastAPI](https://fastapi.tiangolo.com/) documentation

### **Contributing**

We welcome contributions! Areas for improvement:
- Additional AI models integration
- New editing tools and features  
- Performance optimizations
- UI/UX enhancements
- Documentation improvements

## 📈 Changelog

### **v3.0.0 - AI Image Editor Suite**
- ✅ **Three AI Tools**: Inpainting, Object Removal, Text-to-Image
- ✅ **RealVisXL_V5.0**: Upgraded to photorealistic SDXL model
- ✅ **Memory Optimization**: On-demand model loading system
- ✅ **GPU Monitoring**: Real-time memory usage tracking
- ✅ **Multi-page UI**: Dedicated pages for each tool
- ✅ **Enhanced Prompts**: Better default prompts and presets
- ✅ **Aspect Ratios**: Multiple size options for text-to-image
- ✅ **Performance**: Attention slicing and VAE optimization

### **v2.0.0 - SDXL Upgrade** 
- ✅ Stable Diffusion XL Inpainting
- ✅ Interactive canvas-based mask creation
- ✅ 1024x1024 high-resolution output
- ✅ Enhanced UI with brush tools

### **v1.0.0 - Initial Release**
- ✅ Basic SD2 inpainting functionality
- ✅ Simple file upload interface

## 📜 License

This project uses RealVisXL_V5.0 under the CreativeML Open RAIL++-M License. Please review the [model license](https://huggingface.co/SG161222/RealVisXL_V5.0) for commercial use guidelines.

---

**Made with ❤️ for the AI community** • **Powered by RealVisXL_V5.0** • **Optimized for professional results** 