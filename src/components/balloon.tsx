'use client'
import { useEffect, useRef } from 'react'  

export function Ballon() {
  const balloonContainerRef = useRef<HTMLDivElement>(null)
  const generateBalloon = () => {
    if (!balloonContainerRef.current) return

    const balloon = document.createElement('div')
    const size = Math.random() * 10 + 5
    const left = Math.random() * 100
    const delay = Math.random() * 2 

    balloon.className = 'absolute bottom-0 rounded-full opacity-80'
    balloon.style.width = `${size}px`
    balloon.style.height = `${size}px`
    balloon.style.left = `${left}%`
    balloon.style.animationDelay = `${delay}s`
    balloon.style.animation = `floatUp 5s ease-out infinite, colorShift 5s infinite`
    balloonContainerRef.current.appendChild(balloon)
    setTimeout(() => {balloon.remove()}, 5000)
  }

  useEffect(() => {
    const balloonInterval = setInterval(generateBalloon, 500) 
    return () => clearInterval(balloonInterval) 
  }, [])

  return (
    <div ref={balloonContainerRef} 
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden" 
    />
  )
}