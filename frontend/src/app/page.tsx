'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Download, Loader, AlertCircle, ImageIcon } from 'lucide-react'

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
  const [maskImage, setMaskImage] = useState<File | null>(null)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<InpaintingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Advanced parameters
  const [numSteps, setNumSteps] = useState(50)
  const [guidanceScale, setGuidanceScale] = useState(7.5)
  const [strength, setStrength] = useState(1.0)

  const onOriginalDrop = useCallback((acceptedFiles: File[]) => {
    setOriginalImage(acceptedFiles[0])
    setError(null)
  }, [])

  const onMaskDrop = useCallback((acceptedFiles: File[]) => {
    setMaskImage(acceptedFiles[0])
    setError(null)
  }, [])

  const { getRootProps: getOriginalRootProps, getInputProps: getOriginalInputProps, isDragActive: isOriginalDragActive } = useDropzone({
    onDrop: onOriginalDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false
  })

  const { getRootProps: getMaskRootProps, getInputProps: getMaskInputProps, isDragActive: isMaskDragActive } = useDropzone({
    onDrop: onMaskDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!originalImage || !maskImage || !prompt.trim()) {
      setError('Please provide an original image, mask image, and prompt')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', originalImage)
      formData.append('mask', maskImage)
      formData.append('prompt', prompt)
      formData.append('num_inference_steps', numSteps.toString())
      formData.append('guidance_scale', guidanceScale.toString())
      formData.append('strength', strength.toString())

      const response = await fetch('http://localhost:8000/inpaint', {
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
          Stable Diffusion Inpainting
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload an image and mask to perform AI-powered inpainting using Stable Diffusion 2
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Input Images</h2>
            
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

            {/* Mask Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mask Image (White = inpaint, Black = keep)
              </label>
              <div
                {...getMaskRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isMaskDragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                <input {...getMaskInputProps()} />
                {maskImage ? (
                  <div className="space-y-2">
                    <img
                      src={URL.createObjectURL(maskImage)}
                      alt="Mask"
                      className="max-h-32 mx-auto rounded"
                    />
                    <p className="text-sm text-gray-600">{maskImage.name}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="text-gray-600">
                      {isMaskDragActive ? 'Drop the mask here' : 'Drag & drop or click to select'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to generate in the masked area..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
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
                    Inference Steps: {numSteps}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={numSteps}
                    onChange={(e) => setNumSteps(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Guidance Scale: {guidanceScale}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
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
              disabled={loading || !originalImage || !maskImage || !prompt.trim()}
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