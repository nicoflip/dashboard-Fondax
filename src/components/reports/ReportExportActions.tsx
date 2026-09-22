'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Copy, Check, Download, Printer, FileBarChart, FileText, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportExportActionsProps {
  loading: boolean
  fetchData: () => void
  generateMarkdownReport: () => string
  startDate: string
  endDate: string
  viewMode: 'interactive' | 'document'
  setViewMode: (mode: 'interactive' | 'document') => void
}

export function ReportExportActions({
  loading,
  fetchData,
  generateMarkdownReport,
  startDate,
  endDate,
  viewMode,
  setViewMode
}: ReportExportActionsProps) {
  const [copied, setCopied] = useState(false)

  // Copy Markdown to clipboard
  const handleCopyMarkdown = async () => {
    const md = generateMarkdownReport()
    try {
      await navigator.clipboard.writeText(md)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('Erreur lors de la copie', err)
    }
  }

  // Download report file
  const handleDownloadFile = () => {
    const md = generateMarkdownReport()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport_fondax_${startDate || 'debut'}_au_${endDate || 'fin'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Print report
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4 print:hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileBarChart className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Rapports d'activité & Avancement</h1>
          </div>
          <p className="text-sm text-slate-500">
            Générez des comptes-rendus complets des tâches accomplies et du suivi des chantiers entre deux dates
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            title="Rafraîchir les données"
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleCopyMarkdown}
            className={cn("flex items-center gap-1.5 transition-all", copied && "border-green-600 text-green-700 bg-green-50")}
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copié !' : 'Copier (Markdown)'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Exporter .md</span>
          </Button>

          <Button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / PDF</span>
          </Button>
        </div>
      </div>

      {/* View Mode Toggle Bar */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('interactive')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              viewMode === 'interactive'
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Vue Interactive</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('document')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              viewMode === 'document'
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📄 Aperçu Document Exécutif (A4)</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 hidden sm:block pr-3">
          {viewMode === 'document' ? 'Mise en page officielle Fondax pour présentation & export' : 'Filtres dynamiques et navigation par onglets'}
        </div>
      </div>
    </div>
  )
}

