"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Undo2, Eraser } from "lucide-react"

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void
  width?: number
  height?: number
  penColor?: string
  className?: string
}

export function SignaturePad({
  onSignatureChange,
  width = 500,
  height = 200,
  penColor = "#1a1a2e",
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const historyRef = useRef<ImageData[]>([])

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    return ctx
  }, [])

  useEffect(() => {
    const ctx = getCtx()
    if (!ctx) return
    const canvas = canvasRef.current!
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = 2.5
    ctx.strokeStyle = penColor
    // Draw signature line
    ctx.save()
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(40, height - 40)
    ctx.lineTo(width - 40, height - 40)
    ctx.stroke()
    ctx.restore()
    // X mark
    ctx.save()
    ctx.fillStyle = "#94a3b8"
    ctx.font = "16px serif"
    ctx.fillText("X", 20, height - 34)
    ctx.restore()
    // Save initial blank state
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)]
  }, [width, height, penColor, getCtx])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(e)
    ctx.strokeStyle = penColor
    ctx.lineWidth = 2.5
    ctx.setLineDash([])
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ctx.closePath()
    // Save to history
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (historyRef.current.length > 30) historyRef.current.shift()
    setHasSignature(true)
    onSignatureChange(canvas.toDataURL("image/png"))
  }

  const undo = () => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas || historyRef.current.length <= 1) return
    historyRef.current.pop()
    const prevState = historyRef.current[historyRef.current.length - 1]
    ctx.putImageData(prevState, 0, 0)
    const isEmpty = historyRef.current.length <= 1
    setHasSignature(!isEmpty)
    onSignatureChange(isEmpty ? null : canvas.toDataURL("image/png"))
  }

  const clear = () => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    // Reset
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(40, height - 40)
    ctx.lineTo(width - 40, height - 40)
    ctx.stroke()
    ctx.restore()
    ctx.save()
    ctx.fillStyle = "#94a3b8"
    ctx.font = "16px serif"
    ctx.fillText("X", 20, height - 34)
    ctx.restore()
    historyRef.current = [ctx.getImageData(0, 0, canvas.width * dpr, canvas.height * dpr)]
    setHasSignature(false)
    onSignatureChange(null)
  }

  return (
    <div className={className}>
      <div className="rounded-lg border-2 border-dashed border-primary/20 bg-card overflow-hidden relative group">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair touch-none w-full"
          style={{ width, height }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && !isDrawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground/50 font-medium">Draw your signature above the line</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-muted-foreground">
          {hasSignature ? "Signature captured" : "Use mouse or touch to sign"}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={undo}
            disabled={historyRef.current.length <= 1}
          >
            <Undo2 className="h-3 w-3" /> Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={clear}
            disabled={!hasSignature}
          >
            <Eraser className="h-3 w-3" /> Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
