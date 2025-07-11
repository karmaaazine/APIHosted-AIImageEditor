'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Download, Loader, AlertCircle, ImageIcon, Brush, Eraser, RotateCcw } from 'lucide-react'

interface InpaintingResult {
  success: boolean
  result_image: string
  prompt: string
  parameters: {
    num_inference_steps: number
    guidance_scale: number
    strength: number
  }
}

export default function Home() {
  const [originalImage, setOriginalImage] = useState<File | null>(null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, artifacts, bad anatomy, deformed')
  const [result, setResult] = useState<InpaintingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Canvas and mask states
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [isEraser, setIsEraser] = useState(false)
  const [canvasInitialized, setCanvasInitialized] = useState(false)
  const [showMaskPreview, setShowMaskPreview] = useState(false)
  const [maskPreviewUrl, setMaskPreviewUrl] = useState<string | null>(null)
  
  // Advanced parameters (SDXL optimized)
  const [numSteps, setNumSteps] = useState(20)
  const [guidanceScale, setGuidanceScale] = useState(8.0)
  const [strength, setStrength] = useState(0.99)

  const onOriginalDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    setOriginalImage(file)
    setOriginalImageUrl(URL.createObjectURL(file))
    setError(null)
    setCanvasInitialized(false)
  }, [])

  const { getRootProps: getOriginalRootProps, getInputProps: getOriginalInputProps, isDragActive: isOriginalDragActive } = useDropzone({
    onDrop: onOriginalDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false
  })

  // Initialize canvas when image is loaded
  useEffect(() => {
    if (originalImageUrl && canvasRef.current && !canvasInitialized) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // Set canvas size to match SDXL resolution
        canvas.width = 1024
        canvas.height = 1024
        
        // Draw image as background
        ctx?.drawImage(img, 0, 0, 1024, 1024)
        setCanvasInitialized(true)
      }
      
      img.src = originalImageUrl
    }
  }, [originalImageUrl, canvasInitialized])

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)

    if (isEraser) {
      // Eraser: restore original image
      ctx.globalCompositeOperation = 'source-over'
      const img = new Image()
             img.onload = () => {
         ctx.save()
         ctx.beginPath()
         ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
         ctx.clip()
         ctx.drawImage(img, 0, 0, 1024, 1024)
         ctx.restore()
       }
      img.src = originalImageUrl!
    } else {
      // Brush: paint solid red mask
      ctx.globalCompositeOperation = 'source-over'
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)'  // More opaque red
      ctx.fill()
    }
  }

  const clearMask = () => {
    if (!canvasRef.current || !originalImageUrl) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
      ctx?.drawImage(img, 0, 0, 1024, 1024)
    }
    
    img.src = originalImageUrl
  }

  // Generate mask preview
  const generateMaskPreview = async () => {
    try {
      const maskFile = await canvasToMask()
      const url = URL.createObjectURL(maskFile)
      setMaskPreviewUrl(url)
      setShowMaskPreview(true)
    } catch (error) {
      console.error('Failed to generate mask preview:', error)
    }
  }

  // Convert canvas to mask image
  const canvasToMask = (): Promise<File> => {
    return new Promise((resolve) => {
      if (!canvasRef.current) throw new Error('Canvas not available')
      
      const canvas = canvasRef.current
      const maskCanvas = document.createElement('canvas')
      const maskCtx = maskCanvas.getContext('2d')
      
      maskCanvas.width = canvas.width
      maskCanvas.height = canvas.height
      
      if (!maskCtx) throw new Error('Could not create mask context')
      
      // Fill with black background (preserve areas)
      maskCtx.fillStyle = 'black'
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
      
      // Create mask from painted areas
      const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height)
      if (!imageData) throw new Error('Could not get image data')
      
      const maskImageData = maskCtx.createImageData(canvas.width, canvas.height)
      
      // First pass: fill with black
      for (let i = 0; i < maskImageData.data.length; i += 4) {
        maskImageData.data[i] = 0     // R
        maskImageData.data[i + 1] = 0 // G
        maskImageData.data[i + 2] = 0 // B
        maskImageData.data[i + 3] = 255 // A
      }
      
      // Second pass: detect red areas more precisely
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i]
        const g = imageData.data[i + 1]
        const b = imageData.data[i + 2]
        
        // More precise red detection
        const isRed = r > 150 && r > g * 2 && r > b * 2
        
        if (isRed) {
          // White for inpainting areas
          maskImageData.data[i] = 255
          maskImageData.data[i + 1] = 255
          maskImageData.data[i + 2] = 255
          maskImageData.data[i + 3] = 255
        }
      }
      
      maskCtx.putImageData(maskImageData, 0, 0)
      
      maskCanvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'mask.png', { type: 'image/png' })
          resolve(file)
        }
      }, 'image/png')
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!originalImage || !prompt.trim()) {
      setError('Please provide an original image and prompt')
      return
    }

    if (!canvasInitialized) {
      setError('Please wait for the image to load')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Generate mask from canvas
      const maskFile = await canvasToMask()
      
      const formData = new FormData()
      formData.append('image', originalImage)
      formData.append('mask', maskFile)
      formData.append('prompt', prompt)
      formData.append('negative_prompt', negativePrompt)
      formData.append('num_inference_steps', numSteps.toString())
      formData.append('guidance_scale', guidanceScale.toString())
      formData.append('strength', strength.toString())

      const response = await fetch('http://127.0.0.1:8000/inpaint', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: InpaintingResult = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const downloadResult = () => {
    if (!result) return
    
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${result.result_image}`
    link.download = `inpainted_${Date.now()}.png`
    link.click()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          SDXL Inpainting Studio
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload an image and paint areas to modify with Stable Diffusion XL (1024x1024 quality)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Your Mask</h2>
            
            {/* Original Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Original Image
              </label>
              <div
                {...getOriginalRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isOriginalDragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                <input {...getOriginalInputProps()} />
                {originalImage ? (
                  <div className="space-y-2">
                    <img
                      src={URL.createObjectURL(originalImage)}
                      alt="Original"
                      className="max-h-32 mx-auto rounded"
                    />
                    <p className="text-sm text-gray-600">{originalImage.name}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="text-gray-600">
                      {isOriginalDragActive ? 'Drop the image here' : 'Drag & drop or click to select'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Canvas Mask Editor */}
            {originalImageUrl && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paint Mask (Red areas will be inpainted)
                </label>
                
                {/* Brush Controls */}
                <div className="flex items-center space-x-4 mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsEraser(false)}
                      className={`p-2 rounded ${!isEraser ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}
                    >
                      <Brush className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsEraser(true)}
                      className={`p-2 rounded ${isEraser ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}
                    >
                      <Eraser className="h-4 w-4" />
                    </button>
                    <button
                      onClick={clearMask}
                      className="p-2 rounded bg-gray-200 hover:bg-gray-300"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={generateMaskPreview}
                      className="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600"
                    >
                      Preview Mask
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Brush Size:</label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600 w-8">{brushSize}</span>
                  </div>
                </div>

                {/* Canvas */}
                <div className="border rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-auto cursor-crosshair"
                    style={{ maxWidth: '100%', height: 'auto', aspectRatio: '1/1' }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Click and drag to paint areas for inpainting. Use eraser to remove paint.
                </p>
                
                {/* Mask Preview */}
                {showMaskPreview && maskPreviewUrl && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Mask Preview (White = Inpaint, Black = Keep)
                      </label>
                      <button
                        onClick={() => setShowMaskPreview(false)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Hide
                      </button>
                    </div>
                    <img
                      src={maskPreviewUrl}
                      alt="Mask Preview"
                      className="w-32 h-32 border rounded object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Prompt Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Try: 'black sunglasses with dark frames', 'stylish aviator glasses', 'clear reading glasses'..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
              />
              <div className="mt-1 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setPrompt('black sunglasses with dark frames')}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  Black Sunglasses
                </button>
                <button
                  type="button"
                  onClick={() => setPrompt('stylish aviator glasses with metal frames')}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  Aviator Glasses
                </button>
                <button
                  type="button"
                  onClick={() => setPrompt('clear reading glasses with thin frames')}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  Reading Glasses
                </button>
              </div>
            </div>

            {/* Negative Prompt Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Negative Prompt (What to avoid)
              </label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Things you don't want in the result..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={2}
              />
            </div>

            {/* Advanced Parameters */}
            <details className="mb-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                Advanced Parameters
              </summary>
              <div className="space-y-4 mt-2 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Inference Steps: {numSteps} (SDXL works great with fewer steps)
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={numSteps}
                    onChange={(e) => setNumSteps(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Guidance Scale: {guidanceScale} (SDXL optimized: 5-15)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="0.5"
                    value={guidanceScale}
                    onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Strength: {strength}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={strength}
                    onChange={(e) => setStrength(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </details>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading || !originalImage || !prompt.trim() || !canvasInitialized}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin h-5 w-5" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  <span>Generate Inpainting</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Result</h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {result ? (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={`data:image/png;base64,${result.result_image}`}
                    alt="Inpainted result"
                    className="w-full rounded-lg shadow-md"
                  />
                  <button
                    onClick={downloadResult}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-lg shadow transition-colors"
                    title="Download result"
                  >
                    <Download className="h-4 w-4 text-gray-700" />
                  </button>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Prompt:</strong> {result.prompt}</p>
                  <p><strong>Steps:</strong> {result.parameters.num_inference_steps}</p>
                  <p><strong>Guidance:</strong> {result.parameters.guidance_scale}</p>
                  <p><strong>Strength:</strong> {result.parameters.strength}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ImageIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p>Generated image will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 