'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Download, ZoomIn, ZoomOut, Maximize2, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface SchemaTable {
  table_name: string
  columns: string[]
  data_types: string[]
  column_count: number
}

interface SchemaRelationship {
  from_table: string
  to_table: string
  from_column: string
  to_column: string
}

interface SchemaData {
  tables: SchemaTable[]
  relationships: SchemaRelationship[]
  total_tables: number
  total_relationships: number
}

// Entity categories for color coding
const ENTITY_CATEGORIES: Record<string, { color: string; textColor: string; category: string }> = {
  certificate: { color: 'bg-red-100', textColor: 'text-red-900', category: 'Credentials' },
  seatimeentry: { color: 'bg-red-100', textColor: 'text-red-900', category: 'Credentials' },
  referencecheck: { color: 'bg-red-100', textColor: 'text-red-900', category: 'Credentials' },
  backgroundcheck: { color: 'bg-red-100', textColor: 'text-red-900', category: 'Credentials' },

  crewprofile: { color: 'bg-yellow-100', textColor: 'text-yellow-900', category: 'Profiles' },
  passport: { color: 'bg-yellow-100', textColor: 'text-yellow-900', category: 'Profiles' },
  visa: { color: 'bg-yellow-100', textColor: 'text-yellow-900', category: 'Profiles' },
  contact: { color: 'bg-yellow-100', textColor: 'text-yellow-900', category: 'Profiles' },
  emergencycontact: { color: 'bg-yellow-100', textColor: 'text-yellow-900', category: 'Profiles' },
  attachment: { color: 'bg-purple-100', textColor: 'text-purple-900', category: 'Documents' },
  attachmenttype: { color: 'bg-purple-100', textColor: 'text-purple-900', category: 'Documents' },

  skill: { color: 'bg-pink-100', textColor: 'text-pink-900', category: 'Skills' },
  skilllevel: { color: 'bg-pink-100', textColor: 'text-pink-900', category: 'Skills' },
  skillcategory: { color: 'bg-pink-100', textColor: 'text-pink-900', category: 'Skills' },
  contactskill: { color: 'bg-pink-100', textColor: 'text-pink-900', category: 'Skills' },

  travelitinerary: { color: 'bg-green-100', textColor: 'text-green-900', category: 'Assignments' },
  assignment: { color: 'bg-green-100', textColor: 'text-green-900', category: 'Assignments' },
  position: { color: 'bg-green-100', textColor: 'text-green-900', category: 'Assignments' },
  positiontype: { color: 'bg-green-100', textColor: 'text-green-900', category: 'Assignments' },
  crewreview: { color: 'bg-green-100', textColor: 'text-green-900', category: 'Assignments' },
  medicalrecord: { color: 'bg-green-100', textColor: 'text-green-900', category: 'Assignments' },

  vessel: { color: 'bg-blue-100', textColor: 'text-blue-900', category: 'Vessels' },
  vesselmovement: { color: 'bg-blue-100', textColor: 'text-blue-900', category: 'Vessels' },
  location: { color: 'bg-blue-100', textColor: 'text-blue-900', category: 'Vessels' },
  country: { color: 'bg-blue-100', textColor: 'text-blue-900', category: 'Vessels' },
}

export function DataFlowGraph() {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [search, setSearch] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [nodeDragPosition, setNodeDragPosition] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { data, isLoading, error } = useSWR('/api/schema/graph', fetcher)

  const getEntityColor = (tableName: string) => {
    const key = tableName.toLowerCase()
    for (const [pattern, config] of Object.entries(ENTITY_CATEGORIES)) {
      if (key.includes(pattern)) return config
    }
    return { color: 'bg-gray-100', textColor: 'text-gray-900', category: 'Other' }
  }

  const getRelationsForTable = (tableName: string) => {
    if (!data?.relationships) return []
    return data.relationships.filter((r) => r.from_table === tableName || r.to_table === tableName)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((z) => Math.min(3, Math.max(0.3, z * delta)))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.target === containerRef.current) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setPan({ x: pan.x + dx / zoom, y: pan.y + dy / zoom })
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedNode(null)
  }

  const handleNodeMouseDown = (e: React.MouseEvent, tableName: string) => {
    if (e.button === 0) {
      e.stopPropagation()
      setDraggedNode(tableName)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleNodeMouseMove = (e: React.MouseEvent, tableName: string) => {
    if (draggedNode !== tableName) return
    const currentPos = nodeDragPosition.get(tableName) || { x: 0, y: 0 }
    const dx = (e.clientX - dragStart.x) / zoom
    const dy = (e.clientY - dragStart.y) / zoom
    const newPos = new Map(nodeDragPosition)
    newPos.set(tableName, { x: currentPos.x + dx, y: currentPos.y + dy })
    setNodeDragPosition(newPos)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const toggleExpanded = (tableName: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName)
    } else {
      newExpanded.add(tableName)
    }
    setExpandedNodes(newExpanded)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center gap-2 h-96">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p>Generating ERD visualization...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !data?.tables) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Data Flow Graph</CardTitle>
        </CardHeader>
        <CardContent className="text-destructive">
          <p>Error loading schema: {error?.message || 'Unknown error'}</p>
        </CardContent>
      </Card>
    )
  }

  const filteredTables = search
    ? data.tables.filter((t) => t.table_name.toLowerCase().includes(search.toLowerCase()))
    : data.tables

  const filteredTableNames = new Set(filteredTables.map((t) => t.table_name))
  const filteredRelationships = data.relationships.filter(
    (r) => filteredTableNames.has(r.from_table) && filteredTableNames.has(r.to_table)
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Entity Relationship Diagram</span>
            <Badge variant="secondary">
              {filteredTables.length} / {data.total_tables} entities • {filteredRelationships.length} relationships
            </Badge>
          </CardTitle>
          <CardDescription>Interactive ERD - scroll to zoom, drag to pan, click cards to expand columns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Search entities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.3))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Graph Container */}
          <div
            ref={containerRef}
            className="border rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 overflow-auto cursor-grab active:cursor-grabbing select-none relative"
            style={{ height: '800px', perspective: '1000px' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid background */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `linear-gradient(0deg, #000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
                transform: `translate(${pan.x * zoom}px, ${pan.y * zoom}px) scale(${zoom})`,
                transformOrigin: '0 0',
                pointerEvents: 'none',
              }}
            />

            {/* Nodes container */}
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              {filteredTables.map((table) => {
                const color = getEntityColor(table.table_name)
                const isExpanded = expandedNodes.has(table.table_name)
                const relations = getRelationsForTable(table.table_name)
                const dragPos = nodeDragPosition.get(table.table_name) || { x: 0, y: 0 }
                const isDragged = draggedNode === table.table_name

                // Calculate default position based on grid
                const defaultX = (filteredTables.indexOf(table) % 4) * 280 + 20
                const defaultY = Math.floor(filteredTables.indexOf(table) / 4) * 280 + 20

                return (
                  <div
                    key={table.table_name}
                    className={cn(
                      'absolute cursor-move select-none',
                      'transition-all duration-100 hover:shadow-lg',
                      isDragged && 'shadow-2xl z-50'
                    )}
                    style={{
                      left: `${defaultX + dragPos.x}px`,
                      top: `${defaultY + dragPos.y}px`,
                      width: isExpanded ? '320px' : '280px',
                    }}
                    onMouseDown={(e) => handleNodeMouseDown(e, table.table_name)}
                    onMouseMove={(e) => handleNodeMouseMove(e, table.table_name)}
                  >
                    <div
                      className={cn(
                        'border-2 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all',
                        color.color,
                        color.textColor
                      )}
                    >
                      {/* Header */}
                      <div
                        className="bg-gray-700 text-white px-4 py-3 flex items-center justify-between cursor-default"
                        onClick={() => toggleExpanded(table.table_name)}
                      >
                        <div className="flex-1">
                          <h3 className="font-bold text-sm">{table.table_name}</h3>
                          <p className="text-xs opacity-75">{table.column_count} columns</p>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>

                      {/* Body */}
                      <div className="px-3 py-2">
                        {/* Column preview or full list */}
                        <div className="space-y-1 text-xs">
                          {isExpanded ? (
                            table.columns.map((col, i) => (
                              <div key={i} className="flex justify-between items-start gap-2 py-0.5 border-b border-current border-opacity-10 last:border-0">
                                <code className="font-mono text-xs flex-1 truncate">{col}</code>
                                <span className="opacity-60 text-xs flex-shrink-0">{table.data_types[i]}</span>
                              </div>
                            ))
                          ) : (
                            <>
                              {table.columns.slice(0, 3).map((col, i) => (
                                <div key={i} className="truncate opacity-75 font-mono">
                                  • {col}
                                </div>
                              ))}
                              {table.columns.length > 3 && (
                                <button
                                  onClick={() => toggleExpanded(table.table_name)}
                                  className="text-xs opacity-60 hover:opacity-100 font-semibold pt-1 transition-opacity"
                                >
                                  +{table.columns.length - 3} more columns ↓
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Relations */}
                        {relations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                            <p className="text-xs font-semibold opacity-70 mb-1">Relations:</p>
                            <div className="space-y-0.5 text-xs">
                              {relations.slice(0, isExpanded ? 10 : 2).map((rel, i) => (
                                <div key={i} className="opacity-75 font-mono">
                                  {rel.from_table === table.table_name ? '→' : '←'} {rel.from_table === table.table_name ? rel.to_table : rel.from_table}
                                </div>
                              ))}
                              {relations.length > (isExpanded ? 10 : 2) && (
                                <div className="text-xs opacity-60">+{relations.length - (isExpanded ? 10 : 2)} more</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <Card className="bg-muted">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{filteredTables.length}</p>
                <p className="text-xs text-muted-foreground">Entities Visible</p>
              </CardContent>
            </Card>
            <Card className="bg-muted">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{filteredRelationships.length}</p>
                <p className="text-xs text-muted-foreground">Relationships</p>
              </CardContent>
            </Card>
            <Card className="bg-muted">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{Math.round(zoom * 100)}%</p>
                <p className="text-xs text-muted-foreground">Zoom Level</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
