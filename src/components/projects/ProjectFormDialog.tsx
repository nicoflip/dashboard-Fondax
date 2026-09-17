import React from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ProjectStatus } from '@/lib/types'

interface ProjectFormState {
  priority_order: number
  name: string
  description: string
  status: ProjectStatus
  notes_blockers: string
}

interface ProjectFormDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  formState: ProjectFormState
  setFormState: (state: ProjectFormState) => void
  onSave: () => void
  submitLabel: string
}

export function ProjectFormDialog({
  isOpen, onClose, title, formState, setFormState, onSave, submitLabel
}: ProjectFormDialogProps) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ordre de priorité</Label>
            <Input 
              type="number" 
              value={formState.priority_order} 
              onChange={e => setFormState({...formState, priority_order: parseInt(e.target.value) || 1})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select 
              value={formState.status} 
              onChange={e => setFormState({...formState, status: e.target.value as ProjectStatus})}
            >
              <option value="À FAIRE">À FAIRE</option>
              <option value="EN COURS">EN COURS</option>
              <option value="EN ATTENTE">EN ATTENTE</option>
              <option value="TERMINÉ">TERMINÉ</option>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Nom du chantier</Label>
          <Input 
            value={formState.name} 
            onChange={e => setFormState({...formState, name: e.target.value})} 
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea 
            value={formState.description} 
            onChange={e => setFormState({...formState, description: e.target.value})} 
          />
        </div>
        <div className="space-y-2">
          <Label>Notes & points bloquants</Label>
          <Textarea 
            value={formState.notes_blockers} 
            onChange={e => setFormState({...formState, notes_blockers: e.target.value})} 
            rows={4}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={onSave} disabled={!formState.name}>{submitLabel}</Button>
      </DialogFooter>
    </Dialog>
  )
}
