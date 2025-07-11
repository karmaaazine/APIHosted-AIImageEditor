'use client'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import { Download, Loader, AlertCircle, ImageIcon, Wand2, RotateCcw, ArrowLeft, Settings, Sparkles } from 'lucide-react'

interface GenerateResult {
  success: boolean
  result_image: string
  prompt: string
  parameters: {
    num_inference_steps: number
    guidance_scale: number
    width: number
    height: number
  }
  gpu_memory?: {
    cached_memory_gb: number
    total_memory_gb: number
    utilization_percent: number
  }
}

export default function GeneratePage() {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('bad hands, bad anatomy, ugly, deformed, blurry, low quality, worst quality')
  const [numInferenceSteps, setNumInferenceSteps] = useState(25)
  const [guidanceScale, setGuidanceScale] = useState(7.0)
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const aspectRatios = [
    { label: 'Square', width: 1024, height: 1024, ratio: '1:1' },
    { label: 'Portrait', width: 768, height: 1024, ratio: '3:4' },
    { label: 'Landscape', width: 1024, height: 768, ratio: '4:3' },
    { label: 'Wide', width: 1152, height: 768, ratio: '3:2' }
  ]

  const presetPrompts = [
    "A majestic mountain landscape at sunset with dramatic clouds",
    "Portrait of a wise old wizard with flowing robes and magical staff",
    "Futuristic cyberpunk city with neon lights and flying cars",
    "Peaceful Japanese garden with cherry blossoms and koi pond",
    "Steampunk airship floating above Victorian city",
    "Ancient dragon perched on castle ruins under moonlight"
  ]

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedImage(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('negative_prompt', negativePrompt)
      formData.append('num_inference_steps', numInferenceSteps.toString())
      formData.append('guidance_scale', guidanceScale.toString())
      formData.append('width', width.toString())
      formData.append('height', height.toString())

      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Generation failed')
      }

      const data: GenerateResult = await response.json()
      
      if (data.success) {
        setGeneratedImage(`data:image/png;base64,${data.result_image}`)
        setResult(data)
      } else {
        throw new Error('Generation failed')
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during generation')
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, negativePrompt, numInferenceSteps, guidanceScale, width, height])

  const downloadImage = useCallback(() => {
    if (generatedImage) {
      const link = document.createElement('a')
      link.href = generatedImage
      link.download = `generated-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [generatedImage])

  const reset = useCallback(() => {
    setPrompt('')
    setGeneratedImage(null)
    setResult(null)
    setError(null)
  }, [])

  const setAspectRatio = useCallback((w: number, h: number) => {
    setWidth(w)
    setHeight(h)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/" className="inline-flex items-center space-x-2 text-white hover:text-primary-100 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </Link>
            <div className="h-6 w-px bg-white/20"></div>
            <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
              <Wand2 className="h-6 w-6" />
              <span>Text to Image Generator</span>
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Advanced</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
          {/* Left Panel - Controls */}
          <div className="space-y-4">
            {/* Prompt Input */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <label className="block text-white font-medium mb-2">
                <Sparkles className="inline h-4 w-4 mr-1" />
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate... (e.g., 'A beautiful sunset over mountains with dramatic clouds')"
                className="w-full h-24 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
              />
              
              {/* Preset Prompts */}
              <div className="mt-3">
                <p className="text-white/80 text-xs mb-2">Quick prompts:</p>
                <div className="flex flex-wrap gap-1">
                  {presetPrompts.slice(0, 3).map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(preset)}
                      className="text-xs px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-white/90 transition-colors"
                    >
                      {preset.length > 40 ? preset.substring(0, 40) + '...' : preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Negative Prompt */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <label className="block text-white font-medium mb-2">Negative Prompt</label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="What you don't want in the image..."
                className="w-full h-16 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none text-sm"
              />
            </div>

            {/* Aspect Ratio Selection */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <label className="block text-white font-medium mb-3">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.ratio}
                    onClick={() => setAspectRatio(ratio.width, ratio.height)}
                    className={`p-2 rounded-lg text-sm transition-colors ${
                      width === ratio.width && height === ratio.height
                        ? 'bg-white/30 text-white'
                        : 'bg-white/20 text-white/80 hover:bg-white/25'
                    }`}
                  >
                    <div className="font-medium">{ratio.label}</div>
                    <div className="text-xs opacity-80">{ratio.width}×{ratio.height}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <h3 className="text-white font-medium mb-3">Advanced Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-white/80 text-sm mb-1">
                      Inference Steps: {numInferenceSteps}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={numInferenceSteps}
                      onChange={(e) => setNumInferenceSteps(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-1">
                      Guidance Scale: {guidanceScale}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={guidanceScale}
                      onChange={(e) => setGuidanceScale(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-white text-primary-600 py-3 px-4 rounded-xl font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5" />
                  <span>Generate Image</span>
                </>
              )}
            </button>

            {/* Reset Button */}
            <button
              onClick={reset}
              className="w-full bg-white/20 text-white py-2 px-4 rounded-xl font-medium hover:bg-white/30 transition-colors flex items-center justify-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </div>

          {/* Right Panel - Result */}
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 h-full min-h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5" />
                  <span>Generated Image</span>
                </h3>
                {generatedImage && (
                  <button
                    onClick={downloadImage}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center h-[500px] bg-white/5 rounded-lg border-2 border-dashed border-white/20">
                {isGenerating ? (
                  <div className="text-center">
                    <Loader className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
                    <p className="text-white/80">Generating your image...</p>
                    <p className="text-white/60 text-sm mt-1">This may take 10-30 seconds</p>
                  </div>
                ) : generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : error ? (
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Wand2 className="h-12 w-12 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60">Enter a prompt and click generate to create an image</p>
                  </div>
                )}
              </div>

              {/* Generation Info */}
              {result && (
                <div className="mt-4 p-3 bg-white/5 rounded-lg">
                  <div className="text-white/80 text-sm space-y-1">
                    <p><strong>Size:</strong> {result.parameters.width}×{result.parameters.height}</p>
                    <p><strong>Steps:</strong> {result.parameters.num_inference_steps}</p>
                    <p><strong>Guidance:</strong> {result.parameters.guidance_scale}</p>
                    {result.gpu_memory && (
                      <p><strong>GPU Memory:</strong> {result.gpu_memory.cached_memory_gb.toFixed(1)}GB / {result.gpu_memory.total_memory_gb.toFixed(1)}GB ({result.gpu_memory.utilization_percent.toFixed(1)}%)</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 