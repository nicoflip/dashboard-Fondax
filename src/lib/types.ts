// Types miroir de la base de données Supabase

export type TaskCategory = 'Sécurité' | 'Réseau' | 'Stockage-SharePoint' | 'Cahier des charges' | 'Prestataires' | 'Matériel' | 'Bureautique' | 'Support Utilisateur' | 'Autre'
export type TaskStatus = 'à faire' | 'en cours' | 'en attente de retour externe' | 'fait'
export type TaskPriority = 'haute' | 'moyenne' | 'basse'
export type EventType = 'rdv' | 'appel' | 'échéance' | 'étape chantier'
export type EventStatus = 'passé' | 'à venir' | 'en attente' | 'clos'
export type OrgCategory = 'gérant' | 'encadrant' | 'opérateur'
export type VendorIssueStatus = 'en attente' | 'résolu' | 'non résolu'
export type ProjectStatus = 'À FAIRE' | 'EN COURS' | 'EN ATTENTE' | 'TERMINÉ'
export type NetworkConnectionType = 'ethernet' | 'wifi' | 'vpn' | 'fibre' | 'inconnu'
export type SecurityLevel = 'bas' | 'moyen' | 'haut' | 'critique'

export interface Task {
  id: string
  title: string
  description: string | null
  category: TaskCategory
  status: TaskStatus
  priority: TaskPriority
  created_at: string
  updated_at: string
}

export interface Network {
  id: string
  ssid: string | null
  ip_range: string | null
  gateway: string | null
  manager: string | null
  role_status: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface NetworkEquipment {
  id: string
  name: string
  type: string | null
  location: string | null
  ip: string | null
  role: string | null
  notes: string | null
  position_x: number
  position_y: number
  created_at: string
}

export interface NetworkConnection {
  id: string
  source_id: string
  target_id: string
  label: string | null
  connection_type?: NetworkConnectionType
  notes: string | null
  created_at: string
}

export interface NetworkZone {
  id: string
  name: string
  description: string | null
  security_level: SecurityLevel
  created_at: string
}

export interface LanDevice {
  id: string
  ip: string
  hostname: string | null
  role: string | null
  network_id: string | null
  created_at: string
}

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  end_date: string | null
  event_type: EventType
  status: EventStatus
  task_id: string | null
  vendor_id: string | null
  created_at: string
}

export interface Computer {
  id: string
  name: string
  user_name: string | null
  person_id: string | null
  os: string | null
  antivirus_status: string | null
  warranty_date: string | null
  notes: string | null
  created_at: string
}

export interface Equipment {
  id: string
  name: string
  type: string | null
  model: string | null
  location: string | null
  characteristics: string | null
  notes: string | null
  created_at: string
}

export interface Person {
  id: string
  name: string
  role: string | null
  department: string | null
  has_pc: boolean
  has_m365: boolean
  category: OrgCategory
  manager_id?: string | null
  created_at: string
}

export interface Vendor {
  id: string
  name: string
  scope: string | null
  known_access: string | null
  notes: string | null
  created_at: string
}

export interface VendorIssue {
  id: string
  vendor_id: string
  title: string
  description: string | null
  status: VendorIssueStatus
  created_at: string
}

export interface Project {
  id: string
  priority_order: number
  name: string
  description: string | null
  status: ProjectStatus
  notes_blockers: string | null
  created_at: string
}

export interface Note {
  id: string
  title: string
  content: string | null
  category: string | null
  created_at: string
  updated_at: string
}

// Types pour les retours attendus (Section « En attente »)
export type WaitingReturnStatus = 'en attente' | 'reçu' | 'archivé'

export interface WaitingReturn {
  id: string
  title: string
  waiting_on: string // Interlocuteur / Tiers (ex: "Orange", "Direction", "Patrick")
  target_type?: string // "Prestataire" | "Fournisseur" | "Direction" | "Utilisateur" | "Autre"
  description?: string | null
  status: WaitingReturnStatus
  follow_up_date?: string | null // YYYY-MM-DD
  follow_up_count: number
  since_date: string // YYYY-MM-DD
  created_at: string
  updated_at: string
}

// Types pour les prérequis et bloqueurs de tâches
export type BlockerType = 'none' | 'task' | 'event' | 'date' | 'waiting'

export interface BlockerConfig {
  type: BlockerType
  prereqTaskId?: string
  requiredStatus: TaskStatus
  prereqEventId?: string
  unlockDate?: string
  prereqReturnId?: string
}

export interface TaskBlockerInfo {
  type: BlockerType
  prereqTaskId?: string
  requiredStatus: TaskStatus
  prereqEventId?: string
  unlockDate?: string
  prereqReturnId?: string
  cleanDescription: string
}

export interface TaskBlockedStatus {
  isBlocked: boolean
  blocker: TaskBlockerInfo
  prereqTask?: Task
  prereqEvent?: CalendarEvent
  prereqReturn?: WaitingReturn
  unlockDate?: string
}

// Types pour les événements à période flexible
export interface FlexibleEventInfo {
  isFlexible: boolean
  flexLabel: string
  cleanDesc: string
}

