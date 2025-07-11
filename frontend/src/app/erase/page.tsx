'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'
import { Upload, Download, Loader, AlertCircle, ImageIcon, Brush, Eraser, RotateCcw, ArrowLeft, Eye, Trash2 } from 'lucide-react'

interface EraseResult {
  success: boolean
  result_image: string
  prompt: string
  operation: string
  parameters: {
    num_inference_steps: number
    guidance_scale: number
    strength: number
  }
}

export default function ErasePage() {
  const [originalImage, setOriginalImage] = useState<File | null>(null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [backgroundPrompt, setBackgroundPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('objects, items, people, text, watermark, logo, signature, artifacts, distorted, unrealistic, inconsistent, blurry, low quality, bad quality, jpeg artifacts, noise, grain, duplicate, cropped, out of frame, worst quality, low quality, ugly, deformed, mutation, extra elements, foreign objects')
  const [result, setResult] = useState<EraseResult | null>(null)
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
  const [numSteps, setNumSteps] = useState(30)
  const [guidanceScale, setGuidanceScale] = useState(7.5)
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
        canvas.width = 512
        canvas.height = 512
        ctx?.drawImage(img, 0, 0, 512, 512)
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
      ctx.globalCompositeOperation = 'source-over'
      const img = new Image()
      img.onload = () => {
        ctx.save()
        ctx.beginPath()
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(img, 0, 0, 512, 512)
        ctx.restore()
      }
      img.src = originalImageUrl!
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)'
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
      ctx?.drawImage(img, 0, 0, 512, 512)
    }
    
    img.src = originalImageUrl
  }

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

  const canvasToMask = (): Promise<File> => {
    return new Promise((resolve) => {
      if (!canvasRef.current) throw new Error('Canvas not available')
      
      const canvas = canvasRef.current
      const maskCanvas = document.createElement('canvas')
      const maskCtx = maskCanvas.getContext('2d')
      
      maskCanvas.width = canvas.width
      maskCanvas.height = canvas.height
      
      if (!maskCtx) throw new Error('Could not create mask context')
      
      maskCtx.fillStyle = 'black'
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
      
      const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height)
      if (!imageData) throw new Error('Could not get image data')
      
      const maskImageData = maskCtx.createImageData(canvas.width, canvas.height)
      
      for (let i = 0; i < maskImageData.data.length; i += 4) {
        maskImageData.data[i] = 0
        maskImageData.data[i + 1] = 0
        maskImageData.data[i + 2] = 0
        maskImageData.data[i + 3] = 255
      }
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i]
        const g = imageData.data[i + 1]
        const b = imageData.data[i + 2]
        
        const isRed = r > 150 && r > g * 2 && r > b * 2
        
        if (isRed) {
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
    
    if (!originalImage) {
      setError('Please provide an image')
      return
    }

    if (!canvasInitialized) {
      setError('Please wait for the image to load')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const maskFile = await canvasToMask()
      
      const formData = new FormData()
      formData.append('image', originalImage)
      formData.append('mask', maskFile)
      formData.append('background_prompt', backgroundPrompt)
      formData.append('negative_prompt', negativePrompt)
      formData.append('num_inference_steps', numSteps.toString())
      formData.append('guidance_scale', guidanceScale.toString())
      formData.append('strength', strength.toString())

      const response = await fetch('http://127.0.0.1:8000/erase', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: EraseResult = await response.json()
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
    link.download = `erased_${Date.now()}.png`
    link.click()
  }

  const backgroundExamples = [
    'grass field',
    'blue sky with clouds',
    'wooden floor',
    'brick wall',
    'sandy beach',
    'forest trees'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Tools</span>
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">Object Removal</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
          {/* Input Controls */}
          <div className="space-y-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Upload Image</h3>
              <div
                {...getOriginalRootProps()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isOriginalDragActive
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-red-400'
                }`}
              >
                <input {...getOriginalInputProps()} />
                {originalImage ? (
                  <div className="space-y-2">
                    <img
                      src={URL.createObjectURL(originalImage)}
                      alt="Original"
                      className="max-h-20 mx-auto rounded"
                    />
                    <p className="text-xs text-gray-600">{originalImage.name}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600">Drop image here</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Background (Optional)</h3>
              <textarea
                value={backgroundPrompt}
                onChange={(e) => setBackgroundPrompt(e.target.value)}
                placeholder="Describe the background to replace with (leave empty for automatic)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={2}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {backgroundExamples.slice(0, 3).map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setBackgroundPrompt(example)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                  >
                    {example}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Leave empty for automatic background generation, or specify what should replace the removed object.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Paint Objects to Remove</h3>
              <div className="flex items-center space-x-2 mb-3">
                <button
                  onClick={() => setIsEraser(false)}
                  className={`p-2 rounded ${!isEraser ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
                >
                  <Brush className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsEraser(true)}
                  className={`p-2 rounded ${isEraser ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
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
                  className="p-2 rounded bg-red-500 text-white hover:bg-red-600"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Size:</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-8">{brushSize}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Paint over objects you want to remove. They will be seamlessly erased.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !originalImage || !canvasInitialized}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin h-4 w-4" />
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Remove Objects</span>
                </>
              )}
            </button>
          </div>

          {/* Canvas */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Mark Objects to Remove</h3>
            {originalImageUrl ? (
              <div className="border rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full h-auto cursor-crosshair bg-gray-50"
                  style={{ aspectRatio: '1/1' }}
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg aspect-square flex items-center justify-center text-gray-400">
                <p>Upload an image to start</p>
              </div>
            )}
          </div>

          {/* Result */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Result</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {result ? (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={`data:image/png;base64,${result.result_image}`}
                    alt="Object removal result"
                    className="w-full rounded-lg shadow-sm"
                  />
                  <button
                    onClick={downloadResult}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-lg shadow transition-colors"
                    title="Download result"
                  >
                    <Download className="h-4 w-4 text-gray-700" />
                  </button>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Operation:</strong> Object Removal</p>
                  <p><strong>Steps:</strong> {result.parameters.num_inference_steps}</p>
                  <p><strong>Guidance:</strong> {result.parameters.guidance_scale}</p>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg aspect-square flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">Result will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 