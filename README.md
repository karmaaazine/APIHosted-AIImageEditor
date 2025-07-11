# SDXL Inpainting Studio

A modern web application for AI-powered image inpainting using **Stable Diffusion XL (SDXL)**. Features an interactive canvas-based mask creation tool and high-quality 1024x1024 image generation. The backend runs on your server with GPU support, while the frontend provides an intuitive web interface.

## ✨ Features

- **🎨 Interactive Mask Creation**: Paint directly on images with brush tools - no external mask files needed
- **🖼️ High Resolution**: 1024x1024 output with SDXL quality
- **🎯 Advanced Prompting**: Positive and negative prompts for precise control
- **🖌️ Professional Canvas Tools**: Brush, eraser, clear, and mask preview
- **📱 Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- **⚡ Optimized Performance**: Fast generation with SDXL-tuned parameters
- **📥 Drag & Drop**: Easy image upload with visual feedback
- **🔄 Real-time Processing**: Live status updates during generation
- **💾 Easy Download**: One-click result saving

## 🏗️ Architecture

- **Backend**: FastAPI (Python) with SDXL Inpainting pipeline
- **Frontend**: Next.js (React/TypeScript) with HTML5 Canvas
- **Model**: Stable Diffusion XL Inpainting (`diffusers/stable-diffusion-xl-1.0-inpainting-0.1`)
- **Resolution**: Native 1024x1024 generation

## 📋 Prerequisites

### Backend (Server)
- Python 3.8+ 
- CUDA-compatible GPU (8GB+ VRAM recommended)
- ~15GB free disk space (for SDXL model download)

### Frontend (Local Machine)
- Node.js 18+
- npm or yarn
- Modern web browser with Canvas support

## 🚀 Setup Instructions

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Make the run script executable
chmod +x run.sh

# Start the backend server
./run.sh
```

The backend will:
- Download the SDXL Inpainting model (~6GB) on first run
- Load the model to GPU (if available)
- Start FastAPI server on `0.0.0.0:8000`

**⚠️ Note**: First startup takes 5-10 minutes for SDXL model download.

### 2. Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🎨 Usage Guide

### Step-by-Step Workflow

1. **📤 Upload Image**: Drag & drop or click to select your image
2. **🖌️ Paint Mask**: Use the interactive canvas tools to paint areas for inpainting
   - **Brush Tool**: Paint red areas that will be modified
   - **Eraser Tool**: Remove painted areas
   - **Clear Tool**: Reset the entire mask
   - **Brush Size**: Adjust from 5-50 pixels
3. **👁️ Preview Mask**: Click "Preview Mask" to see the generated mask (white = inpaint, black = preserve)
4. **✍️ Enter Prompts**: 
   - **Positive Prompt**: Describe what you want to generate
   - **Negative Prompt**: Specify what to avoid
5. **⚙️ Adjust Parameters** (optional):
   - **Inference Steps**: 10-50 (SDXL works great with fewer steps)
   - **Guidance Scale**: 5-15 (how closely to follow prompts)
   - **Strength**: 0.1-1.0 (how much to change masked areas)
6. **🚀 Generate**: Click "Generate Inpainting" and wait for processing
7. **💾 Download**: Save your result with the download button

### 💡 Pro Tips for Better Results

**Effective Prompts:**
- ✅ `"photorealistic black sunglasses with dark reflective lenses"`
- ✅ `"stylish aviator glasses with gold metal frames"`
- ✅ `"designer reading glasses with thin black frames"`
- ❌ Avoid vague prompts like `"glasses"` or `"something cool"`

**Mask Creation:**
- Paint precise, clean areas for best results
- Use the mask preview to verify your selection
- Avoid soft or blurry mask edges

**Parameter Tuning:**
- Start with default settings (Steps: 20, Guidance: 8.0, Strength: 0.99)
- Increase guidance scale for stronger prompt following
- Lower strength for subtle modifications

## 🔌 API Endpoints

### Backend API (FastAPI)

- `GET /` - Health check
- `GET /health` - Model status and system info  
- `POST /inpaint` - Main inpainting endpoint with SDXL

#### Enhanced Inpaint Request
```bash
curl -X POST "http://your-server:8000/inpaint" \
  -F "image=@original.jpg" \
  -F "mask=@mask.png" \
  -F "prompt=black sunglasses with reflective lenses" \
  -F "negative_prompt=blurry, low quality, distorted" \
  -F "num_inference_steps=20" \
  -F "guidance_scale=8.0" \
  -F "strength=0.99"
```

## ⚙️ Configuration

### Backend Configuration

Edit `backend/main.py` to customize:
- CORS origins for different frontend URLs
- Default parameters (steps, guidance, strength)
- Model loading settings
- Image processing pipeline

### Frontend Configuration

Update API endpoint in `frontend/src/app/page.tsx` if backend runs on different server:
```typescript
const response = await fetch('http://your-server-ip:8000/inpaint', {
  method: 'POST',
  body: formData,
})
```

## 🔧 Troubleshooting

### Backend Issues

**SDXL Model Download Fails**:
- Check internet connection and HuggingFace access
- Ensure ~15GB free disk space
- Verify `diffusers` library version compatibility

**CUDA Out of Memory**:
- SDXL requires 8GB+ VRAM for optimal performance
- Close other GPU applications
- Consider using CPU (much slower but functional)

**Import Errors**:
- Verify all dependencies: `pip install -r requirements.txt --force-reinstall`
- Check Python version (3.8+ required)

### Frontend Issues

**Canvas Not Working**:
- Ensure modern browser with HTML5 Canvas support
- Check for JavaScript errors in browser console
- Verify image uploads properly

**CORS Errors**:
- Backend configured for `localhost:3000`, `127.0.0.1:3000`, `0.0.0.0:3000`
- Update CORS settings if using different ports

**Mask Generation Issues**:
- Paint with clear, solid strokes
- Use mask preview to debug
- Refresh page if canvas behaves unexpectedly

## 🚀 Performance Optimization

### SDXL Performance Tips

1. **Hardware Requirements**: 
   - GPU: 8GB+ VRAM (RTX 3070/4060 or better)
   - CPU: Modern multi-core for CPU fallback
   - RAM: 16GB+ system memory

2. **Optimal Settings**:
   - **Resolution**: Keep images at 1024x1024 for best quality
   - **Steps**: 15-25 steps (SDXL sweet spot)
   - **Guidance**: 6-10 for most use cases

3. **Speed Optimizations**:
   - Use `fp16` precision (enabled by default)
   - Close unnecessary applications
   - Ensure adequate cooling for sustained performance

## 🔒 Security Considerations

- **File Upload Validation**: Implement size limits and type checking for production
- **Rate Limiting**: Add request throttling for public deployments  
- **Authentication**: Consider adding user auth for production use
- **HTTPS**: Use secure connections in production environments
- **CORS**: Configure appropriate origins for your deployment

## 🛠️ Development

### Running in Development

**Backend with Hot Reload**:
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend with Hot Reload**:
```bash
cd frontend
npm run dev
```

### Building for Production

**Frontend Production Build**:
```bash
cd frontend
npm run build
npm start
```

**Backend Production**:
- Use a production WSGI server like Gunicorn
- Configure proper logging and monitoring
- Set up reverse proxy (nginx) for static files

## 🎯 Comparison: SDXL vs SD2

| Feature | SD2 (Previous) | SDXL (Current) |
|---------|----------------|----------------|
| Resolution | 512x512 | **1024x1024** |
| Quality | Good | **Excellent** |
| Prompt Following | Moderate | **Superior** |
| Speed | 50+ steps | **15-25 steps** |
| Model Size | ~5GB | ~6GB |
| VRAM Usage | 4-6GB | **6-10GB** |

## 📜 License

This project uses the SDXL Inpainting model under the CreativeML Open RAIL++-M License. Please review the [model license](https://huggingface.co/diffusers/stable-diffusion-xl-1.0-inpainting-0.1) before commercial use.

## 🆘 Support

For issues with:
- **SDXL Model**: Check [HuggingFace SDXL docs](https://huggingface.co/diffusers/stable-diffusion-xl-1.0-inpainting-0.1)
- **Diffusers Library**: Refer to [Diffusers documentation](https://huggingface.co/docs/diffusers)
- **FastAPI**: Check [FastAPI documentation](https://fastapi.tiangolo.com/)
- **Next.js**: Visit [Next.js documentation](https://nextjs.org/docs)
- **Canvas Issues**: MDN [Canvas API reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## 🚀 Recent Updates

### v2.0.0 - SDXL Upgrade
- ✅ Upgraded to Stable Diffusion XL Inpainting
- ✅ Interactive canvas-based mask creation
- ✅ 1024x1024 high-resolution output  
- ✅ Negative prompt support
- ✅ Optimized parameters for SDXL
- ✅ Enhanced UI with brush tools
- ✅ Mask preview functionality
- ✅ Improved prompt suggestions 