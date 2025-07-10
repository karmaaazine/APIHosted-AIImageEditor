# Stable Diffusion 2 Inpainting Web App

A modern web application for AI-powered image inpainting using Stable Diffusion 2. The backend runs on your SSH server with GPU support, while the frontend runs locally on your machine.

## Features

- **Professional UI**: Clean, modern interface built with Next.js and Tailwind CSS
- **Drag & Drop**: Easy image and mask upload with visual feedback
- **Advanced Controls**: Adjustable inference steps, guidance scale, and strength
- **Real-time Processing**: Live status updates during generation
- **Download Results**: Easy download of generated images

## Architecture

- **Backend**: FastAPI (Python) running on SSH server with CUDA support
- **Frontend**: Next.js (React/TypeScript) running locally
- **Model**: Stable Diffusion 2 Inpainting from Hugging Face

## Prerequisites

### Backend (SSH Server)
- Python 3.8+ 
- CUDA-compatible GPU (recommended)
- Sufficient GPU memory (8GB+ recommended)

### Frontend (Local Machine)
- Node.js 18+
- npm or yarn

## Setup Instructions

### 1. Backend Setup (SSH Server)

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
- Download the Stable Diffusion 2 Inpainting model (~5GB)
- Load the model to GPU (if available)
- Start FastAPI server on `0.0.0.0:8000`

**Note**: The first startup will take several minutes to download the model.

### 2. Frontend Setup (Local Machine)

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

1. **Upload Original Image**: Drag and drop or click to select the image you want to modify
2. **Upload Mask Image**: Provide a mask where white areas will be inpainted and black areas will be preserved
3. **Enter Prompt**: Describe what you want to generate in the masked areas
4. **Adjust Parameters** (optional):
   - **Inference Steps**: More steps = higher quality but slower (10-100)
   - **Guidance Scale**: How closely to follow the prompt (1-20)
   - **Strength**: How much to change the masked area (0.1-1.0)
5. **Generate**: Click the generate button and wait for processing
6. **Download**: Save the result by clicking the download button

## API Endpoints

### Backend API (FastAPI)

- `GET /` - Health check
- `GET /health` - Model status and system info
- `POST /inpaint` - Main inpainting endpoint

#### Inpaint Request
```bash
curl -X POST "http://your-server:8000/inpaint" \
  -F "image=@original.jpg" \
  -F "mask=@mask.jpg" \
  -F "prompt=a beautiful sunset" \
  -F "num_inference_steps=50" \
  -F "guidance_scale=7.5" \
  -F "strength=1.0"
```

## Configuration

### Backend Configuration

Edit `backend/main.py` to customize:
- Server host/port
- CORS origins
- Model parameters
- Image processing settings

### Frontend Configuration

Update the API endpoint in `frontend/src/app/page.tsx`:
```typescript
const response = await fetch('http://your-server-ip:8000/inpaint', {
  method: 'POST',
  body: formData,
})
```

## Troubleshooting

### Backend Issues

**Model Download Fails**:
- Check internet connection
- Ensure sufficient disk space (~10GB)
- Verify Hugging Face access

**CUDA Not Available**:
- Check GPU drivers
- Verify CUDA installation
- Model will fall back to CPU (much slower)

**Out of Memory**:
- Reduce image size
- Lower inference steps
- Close other GPU applications

### Frontend Issues

**Cannot Connect to Backend**:
- Verify backend is running on correct port
- Check firewall settings
- Update API endpoint URL
- Ensure CORS is properly configured

**Upload Issues**:
- Check file format (PNG, JPG, JPEG, WEBP)
- Verify file size limits
- Clear browser cache

## Performance Tips

1. **Optimal Image Size**: 512x512 pixels for best performance
2. **GPU Memory**: Monitor GPU usage, reduce batch size if needed
3. **Network**: Use stable connection between frontend and backend
4. **Inference Steps**: Start with 20-30 steps for faster testing

## Security Considerations

- The backend accepts file uploads - implement proper validation in production
- Consider adding authentication for production use
- Limit file sizes and request rates
- Use HTTPS in production

## Development

### Running in Development

**Backend**:
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend**:
```bash
cd frontend
npm run dev
```

### Building for Production

**Frontend**:
```bash
cd frontend
npm run build
npm start
```

## License

This project uses the Stable Diffusion 2 model which has its own license terms. Please review the model license before commercial use.

## Support

For issues with:
- **Stable Diffusion Model**: Check Hugging Face documentation
- **FastAPI**: Refer to FastAPI documentation
- **Next.js**: Check Next.js documentation
- **CUDA/GPU**: Verify your GPU setup and drivers 