'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search, Users, Ship, Map, FileText, DollarSign, Mail, Settings, 
  Lock, ActivitySquare, Network, ZoomIn, ZoomOut, Download
} from 'lucide-react'

interface Entity {
  name: string
  category: 'core' | 'crew' | 'financial' | 'system' | 'integration' | 'auth'
  tables: number
  description: string
  color: string
  icon: React.ReactNode
}

interface Relationship {
  from: string
  to: string
  type: 'one-to-many' | 'many-to-many' | 'one-to-one'
  label: string
}

export default function EntityGraphPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [showRelationships, setShowRelationships] = useState(true)

  const entities: Entity[] = [
    // Core Maritime
    {
      name: 'Ships',
      category: 'core',
      tables: 1,
      description: 'Vessel registry with specifications',
      color: 'bg-blue-500/10 border-blue-500/30',
      icon: <Ship className="h-5 w-5 text-blue-600" />,
    },
    {
      name: 'Voyages',
      category: 'core',
      tables: 1,
      description: 'Maritime journeys & missions',
      color: 'bg-cyan-500/10 border-cyan-500/30',
      icon: <Map className="h-5 w-5 text-cyan-600" />,
    },
    {
      name: 'Crew Management',
      category: 'crew',
      tables: 10,
      description: 'Crew profiles, assignments, sea time, tags',
      color: 'bg-purple-500/10 border-purple-500/30',
      icon: <Users className="h-5 w-5 text-purple-600" />,
    },
    {
      name: 'Crew Applications',
      category: 'crew',
      tables: 1,
      description: 'Application tracking & skills inventory',
      color: 'bg-violet-500/10 border-violet-500/30',
      icon: <FileText className="h-5 w-5 text-violet-600" />,
    },
    // Financial
    {
      name: 'Invoicing System',
      category: 'financial',
      tables: 4,
      description: 'Invoices, line items, settings, payments',
      color: 'bg-emerald-500/10 border-emerald-500/30',
      icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
    },
    {
      name: 'Hour Tracking',
      category: 'financial',
      tables: 1,
      description: 'Crew hourly logs & verification',
      color: 'bg-teal-500/10 border-teal-500/30',
      icon: <ActivitySquare className="h-5 w-5 text-teal-600" />,
    },
    // Documents & Files
    {
      name: 'Document Management',
      category: 'core',
      tables: 2,
      description: 'Documents, signatures, file storage',
      color: 'bg-orange-500/10 border-orange-500/30',
      icon: <FileText className="h-5 w-5 text-orange-600" />,
    },
    // Notifications
    {
      name: 'Notifications',
      category: 'system',
      tables: 3,
      description: 'Rules, preferences, notification queue',
      color: 'bg-red-500/10 border-red-500/30',
      icon: <Mail className="h-5 w-5 text-red-600" />,
    },
    // System
    {
      name: 'Custom Fields',
      category: 'system',
      tables: 2,
      description: 'Dynamic field definitions & values',
      color: 'bg-indigo-500/10 border-indigo-500/30',
      icon: <Settings className="h-5 w-5 text-indigo-600" />,
    },
    {
      name: 'Extensions',
      category: 'system',
      tables: 4,
      description: 'Extensible plugin system with hooks',
      color: 'bg-pink-500/10 border-pink-500/30',
      icon: <Network className="h-5 w-5 text-pink-600" />,
    },
    {
      name: 'Integrations',
      category: 'integration',
      tables: 2,
      description: 'Third-party service connections',
      color: 'bg-amber-500/10 border-amber-500/30',
      icon: <Network className="h-5 w-5 text-amber-600" />,
    },
    // Auth
    {
      name: 'Authentication',
      category: 'auth',
      tables: 6,
      description: 'Users, sessions, accounts, roles',
      color: 'bg-slate-500/10 border-slate-500/30',
      icon: <Lock className="h-5 w-5 text-slate-600" />,
    },
  ]

  const relationships: Relationship[] = [
    { from: 'Ships', to: 'Voyages', type: 'one-to-many', label: 'operates' },
    { from: 'Voyages', to: 'Crew Management', type: 'one-to-many', label: 'employs' },
    { from: 'Ships', to: 'Crew Management', type: 'one-to-many', label: 'stations' },
    { from: 'Crew Management', to: 'Crew Applications', type: 'one-to-one', label: 'sourced from' },
    { from: 'Crew Management', to: 'Invoicing System', type: 'one-to-many', label: 'generates' },
    { from: 'Invoicing System', to: 'Hour Tracking', type: 'one-to-many', label: 'uses' },
    { from: 'Crew Management', to: 'Document Management', type: 'one-to-many', label: 'attached to' },
    { from: 'Ships', to: 'Document Management', type: 'one-to-many', label: 'attached to' },
    { from: 'Voyages', to: 'Document Management', type: 'one-to-many', label: 'attached to' },
    { from: 'Notifications', to: 'Authentication', type: 'one-to-many', label: 'sent to' },
    { from: 'Custom Fields', to: 'Crew Management', type: 'many-to-many', label: 'extends' },
    { from: 'Extensions', to: 'Crew Management', type: 'many-to-many', label: 'hooks into' },
    { from: 'Integrations', to: 'Invoicing System', type: 'many-to-many', label: 'syncs with' },
    { from: 'Authentication', to: 'Crew Management', type: 'one-to-many', label: 'manages' },
  ]

  const filteredEntities = entities.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const categoryColors: Record<string, { bg: string; text: string }> = {
    core: { bg: 'bg-blue-100', text: 'text-blue-800' },
    crew: { bg: 'bg-purple-100', text: 'text-purple-800' },
    financial: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    system: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    integration: { bg: 'bg-amber-100', text: 'text-amber-800' },
    auth: { bg: 'bg-slate-100', text: 'text-slate-800' },
  }

  const getRelatedEntities = (entityName: string) => {
    const related = new Set<string>()
    relationships.forEach(r => {
      if (r.from === entityName) related.add(r.to)
      if (r.to === entityName) related.add(r.from)
    })
    return Array.from(related)
  }

  const downloadDiagram = () => {
    const svg = document.getElementById('diagram-svg')
    if (svg) {
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svg)
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'entity-diagram.svg'
      link.click()
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-balance">Entity Relationship Diagram</h1>
        <p className="text-lg text-muted-foreground">
          Complete visualization of your maritime crew management system data structure and relationships
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showRelationships ? 'default' : 'outline'}
            onClick={() => setShowRelationships(!showRelationships)}
            className="gap-2"
          >
            <Network className="h-4 w-4" />
            {showRelationships ? 'Hide' : 'Show'} Links
          </Button>
          <Button variant="outline" onClick={downloadDiagram} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
        {Object.entries(categoryColors).map(([category, colors]) => (
          <div key={category} className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${colors.bg}`} />
            <span className="text-xs font-medium capitalize text-muted-foreground">{category}</span>
          </div>
        ))}
      </div>

      {/* Main Diagram */}
      <div className="relative bg-card border rounded-lg p-6 overflow-x-auto">
        <svg
          id="diagram-svg"
          viewBox="0 0 1200 800"
          className="w-full min-w-max"
          style={{ backgroundColor: 'transparent' }}
        >
          {/* Relationship Lines */}
          {showRelationships &&
            relationships.map((rel, idx) => {
              const fromIdx = entities.findIndex(e => e.name === rel.from)
              const toIdx = entities.findIndex(e => e.name === rel.to)
              if (fromIdx === -1 || toIdx === -1) return null

              const cols = 6
              const x1 = (fromIdx % cols) * 180 + 100
              const y1 = Math.floor(fromIdx / cols) * 200 + 100
              const x2 = (toIdx % cols) * 180 + 100
              const y2 = Math.floor(toIdx / cols) * 200 + 100

              const isOneToMany = rel.type === 'one-to-many'
              const strokeColor =
                rel.from === selectedEntity || rel.to === selectedEntity
                  ? '#3b82f6'
                  : '#d1d5db'
              const strokeWidth = selectedEntity ? (rel.from === selectedEntity || rel.to === selectedEntity ? 2 : 1) : 1

              return (
                <g key={idx} opacity={selectedEntity ? (rel.from === selectedEntity || rel.to === selectedEntity ? 1 : 0.2) : 0.6}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isOneToMany ? '5,5' : '0'}
                  />
                  {/* Arrowhead */}
                  <polygon
                    points={`${x2},${y2} ${x2 - 8},${y2 - 5} ${x2 - 8},${y2 + 5}`}
                    fill={strokeColor}
                  />
                  {/* Label */}
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 5}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#666"
                    className="pointer-events-none"
                  >
                    {rel.label}
                  </text>
                </g>
              )
            })}

          {/* Entity Nodes */}
          {entities.map((entity, idx) => {
            const cols = 6
            const x = (idx % cols) * 180 + 20
            const y = Math.floor(idx / cols) * 200 + 20
            const isSelected = selectedEntity === entity.name

            return (
              <g
                key={idx}
                onClick={() => setSelectedEntity(isSelected ? null : entity.name)}
                style={{ cursor: 'pointer' }}
                opacity={!selectedEntity || isSelected || getRelatedEntities(entity.name).length > 0 ? 1 : 0.3}
              >
                <rect
                  x={x}
                  y={y}
                  width="160"
                  height="80"
                  rx="8"
                  fill="white"
                  stroke={isSelected ? '#3b82f6' : '#e5e7eb'}
                  strokeWidth={isSelected ? 3 : 1}
                  className="transition-all"
                />
                <text x={x + 80} y={y + 25} textAnchor="middle" fontSize="13" fontWeight="600" fill="#1f2937">
                  {entity.name}
                </text>
                <text x={x + 80} y={y + 45} textAnchor="middle" fontSize="11" fill="#6b7280">
                  {entity.tables} table{entity.tables > 1 ? 's' : ''}
                </text>
                <text x={x + 80} y={y + 65} textAnchor="middle" fontSize="9" fill="#9ca3af">
                  {entity.category.toUpperCase()}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Entity Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Entities ({filteredEntities.length})</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEntities.map((entity) => {
            const isSelected = selectedEntity === entity.name
            const related = getRelatedEntities(entity.name)

            return (
              <Card
                key={entity.name}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-foreground/50'
                }`}
                onClick={() => setSelectedEntity(isSelected ? null : entity.name)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {entity.icon}
                        {entity.name}
                      </CardTitle>
                      <CardDescription className="mt-1">{entity.description}</CardDescription>
                    </div>
                    <Badge className={categoryColors[entity.category].bg + ' ' + categoryColors[entity.category].text}>
                      {entity.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">{entity.tables} Table{entity.tables > 1 ? 's' : ''}</p>
                  </div>
                  {related.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Connected to:</p>
                      <div className="flex flex-wrap gap-1">
                        {related.map((relatedName) => (
                          <Badge key={relatedName} variant="secondary" className="text-xs">
                            {relatedName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{entities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{entities.reduce((sum, e) => sum + e.tables, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Relationships</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{relationships.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Object.keys(categoryColors).length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
