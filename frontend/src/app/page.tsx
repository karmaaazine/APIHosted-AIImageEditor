'use client'

import React from 'react'
import Link from 'next/link'
import { Brush, Eraser, Sparkles, Wand2, Zap, ChevronRight } from 'lucide-react'

export default function HomePage() {
  const tools = [
    {
      id: 'inpaint',
      title: 'AI Inpainting',
      description: 'Replace or modify objects in your images with AI-generated content',
      icon: Brush,
      status: 'available',
      gradient: 'from-purple-500 to-pink-500',
      image: '🤖'
    },
    {
      id: 'erase',
      title: 'Object Removal',
      description: 'Seamlessly remove unwanted objects from your photos',
      icon: Eraser,
      status: 'available',
      gradient: 'from-blue-500 to-cyan-500',
      image: '🚀'
    },
    {
      id: 'enhance',
      title: 'AI Enhancement',
      description: 'Upscale and enhance image quality using advanced AI',
      icon: Sparkles,
      status: 'coming_soon',
      gradient: 'from-green-500 to-emerald-500',
      image: '🌟'
    },
    {
      id: 'generate',
      title: 'Text to Image',
      description: 'Generate stunning images from text descriptions',
      icon: Wand2,
      status: 'coming_soon',
      gradient: 'from-orange-500 to-red-500',
      image: '👨‍🚀'
    },
    {
      id: 'style',
      title: 'Style Transfer',
      description: 'Apply artistic styles to your images with neural networks',
      icon: Zap,
      status: 'coming_soon',
      gradient: 'from-indigo-500 to-purple-500',
      image: '🎨'
    }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-white bg-opacity-5 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-white bg-opacity-5 rounded-full blur-xl"></div>
        <div className="absolute bottom-40 right-10 w-28 h-28 bg-white bg-opacity-10 rounded-full blur-xl"></div>
      </div>

      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6 tracking-tight">
            AI IMAGE EDITOR
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Professional AI-powered image editing tools using state-of-the-art machine learning models. 
            Transform your images with the power of artificial intelligence.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {tools.map((tool) => {
            const IconComponent = tool.icon
            const isAvailable = tool.status === 'available'
            
            return (
              <div key={tool.id} className="group relative">
                {isAvailable ? (
                  <Link href={`/${tool.id}`}>
                    <ToolCard tool={tool} IconComponent={IconComponent} isAvailable={isAvailable} />
                  </Link>
                ) : (
                  <ToolCard tool={tool} IconComponent={IconComponent} isAvailable={isAvailable} />
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-20">
          <p className="text-white/60 text-sm">
            Powered by Stable Diffusion XL • Built with Next.js & FastAPI
          </p>
        </div>
      </div>
    </div>
  )
}

function ToolCard({ tool, IconComponent, isAvailable }: {
  tool: any,
  IconComponent: any,
  isAvailable: boolean
}) {
  return (
    <div className={`tool-card p-8 h-full relative overflow-hidden ${
      isAvailable 
        ? 'cursor-pointer hover:scale-105' 
        : 'opacity-75 cursor-not-allowed'
    }`}>
      {/* Card background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
      
      {/* Card content */}
      <div className="relative z-10">
        {/* Status badge */}
        <div className="flex justify-between items-start mb-6">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isAvailable 
              ? 'bg-green-100 text-green-700' 
              : 'bg-amber-100 text-amber-700'
          }`}>
            {isAvailable ? 'Available' : 'Coming Soon'}
          </div>
          {isAvailable && (
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
          )}
        </div>

        {/* Icon and emoji */}
        <div className="flex items-center justify-between mb-6">
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${tool.gradient} bg-opacity-10`}>
            <IconComponent className="h-8 w-8 text-gray-700" />
          </div>
          <div className="text-4xl">{tool.image}</div>
        </div>

        {/* Title and description */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-700 transition-colors">
            {tool.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {tool.description}
          </p>
        </div>

        {/* Decorative element */}
        <div className="absolute bottom-4 right-4 w-16 h-16 bg-gradient-to-br from-white to-gray-100 rounded-full opacity-20 group-hover:opacity-30 transition-opacity"></div>
      </div>
    </div>
  )
} 