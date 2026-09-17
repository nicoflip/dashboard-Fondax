# Dashboard Fondax

Dashboard interne Next.js 14 (App Router) connecte a Supabase. Gestion de taches, projets/chantiers, calendrier, reseau, parc informatique, prestataires, organigramme et notes.

---

## Stack technique

| Techno | Usage |
|---|---|
| Next.js 14 (App Router) | Framework React, routing |
| TypeScript | Typage strict |
| Tailwind CSS | Styling |
| Supabase | Base de donnees + Auth |
| ReactFlow (@xyflow/react) | Carte reseau interactive |
| FullCalendar | Vue calendrier |
| Tiptap | Editeur de notes |
| Lucide React | Icones |

---

## Structure du projet

```
src/
├── app/                          # Routes Next.js (App Router)
│   ├── page.tsx                  # Dashboard principal (stats + alertes)
│   ├── layout.tsx                # Layout racine
│   ├── globals.css               # Styles globaux
│   ├── auth/                     # Callback d'authentification Supabase
│   ├── login/                    # Page de connexion
│   ├── creer-compte/             # Page de creation de compte
│   ├── en-attente/               # Page compte en attente de validation
│   ├── taches/                   # Gestion des taches
│   │   └── page.tsx              # Page taches (logique centralisee)
│   ├── chantiers/                # Gestion des projets/chantiers
│   │   └── page.tsx              # ~142 lignes - importe depuis components/projects/
│   ├── calendrier/               # Calendrier des evenements
│   │   ├── page.tsx              # ~160 lignes - importe depuis components/calendar/
│   │   └── loading.tsx           # Skeleton de chargement
│   ├── rapports/                 # Rapports periodiques
│   │   └── page.tsx              # ~90 lignes - importe depuis components/reports/
│   ├── reseau/                   # Carte reseau interactive (ReactFlow)
│   │   ├── page.tsx              # ~12 lignes - Provider + NetworkCanvas
│   │   └── loading.tsx           # Skeleton de chargement
│   ├── parc/                     # Parc informatique (postes, equipements)
│   ├── prestataires/             # Gestion des prestataires
│   ├── organigramme/             # Organigramme (ReactFlow)
│   └── notes/                   # Notes (editeur Tiptap)
│
├── components/
│   ├── ui/                       # Composants UI generiques reutilisables
│   │   ├── badge.tsx, button.tsx, card.tsx, date-picker.tsx
│   │   ├── dialog.tsx, input.tsx, label.tsx, select.tsx
│   │   ├── tabs.tsx, textarea.tsx
│   │
│   ├── shared/                   # Selecteurs reutilisables inter-features
│   │   ├── ProjectSelector.tsx
│   │   ├── TaskSelector.tsx
│   │   └── WaitingReturnSelector.tsx
│   │
│   ├── layout/                   # Composants de layout
│   │   ├── Sidebar.tsx
│   │   └── LayoutWrapper.tsx
│   │
│   ├── tasks/                    # Composants de gestion des taches
│   │   ├── TaskCard.tsx, TaskFilters.tsx, TaskFormDialog.tsx
│   │   ├── TaskFollowUpDialog.tsx, TaskWaitingDialog.tsx
│   │   ├── TaskScheduleDialog.tsx, TaskSelectReturnDialog.tsx
│   │   └── TaskBlockerSelector.tsx
│   │
│   ├── calendar/                 # Composants du calendrier
│   │   ├── calendar-utils.ts     # Helpers et config des types d'evenements
│   │   ├── useCalendarData.ts    # Hooks de donnees (fetch Supabase + etat)
│   │   ├── CalendarFilters.tsx, CalendarKPIBar.tsx
│   │   ├── CalendarRightPanel.tsx, CalendarAgendaView.tsx
│   │   ├── FlexibleEventsView.tsx, EventFormDialog.tsx
│   │   ├── EventClosureDialog.tsx, CalendarSyncOptions.tsx
│   │
│   ├── waiting/                  # Composants En attente de retour
│   │   └── FollowUpReturnDialog.tsx
│   │
│   ├── projects/                 # Composants de gestion des chantiers
│   │   ├── useChantiers.ts       # Hook de donnees et d'etat
│   │   ├── ProjectCard.tsx, ProjectFilters.tsx
│   │   ├── ProjectProgressBar.tsx, ProjectFormDialog.tsx
│   │   └── ProjectWorkspace.tsx
│   │
│   ├── reports/                  # Composants de rapports
│   │   ├── useReportData.ts      # Hook de donnees et calculs
│   │   ├── reportGenerator.ts    # Generation export Markdown
│   │   ├── ReportFilters.tsx, ReportStatsCards.tsx
│   │   ├── ReportTaskList.tsx, ReportEventsList.tsx
│   │   ├── ReportProjectsList.tsx, ReportExportActions.tsx
│   │
│   └── network/                  # Composants de la carte reseau (ReactFlow)
│       ├── NetworkUtils.tsx      # Helpers, modeles, config d'icones (JSX)
│       ├── NetworkContext.tsx    # Contexte React (lock/state global)
│       ├── NetworkCanvas.tsx     # Canvas ReactFlow principal
│       ├── NetworkEquipmentNode.tsx, NetworkFrameNode.tsx
│       ├── NetworkZoneNode.tsx, NetworkLanPanel.tsx
│       ├── NetworkEquipmentDialog.tsx, NetworkConnectionDialog.tsx
│       └── NetworkDialogs.tsx
│
└── lib/                          # Logique metier et utilitaires
    ├── supabase/client.ts        # Client Supabase navigateur
    ├── supabase/server.ts        # Client Supabase serveur (SSR)
    ├── types.ts                  # Types TypeScript globaux (interfaces DB)
    ├── utils.ts                  # Helpers UI (cn, formatDate, couleurs)
    ├── blockers.ts               # Logique des prerequis/bloqueurs de taches
    ├── projects.ts               # Helpers de gestion des projets
    ├── waiting.ts                # Helpers statuts d'attente
    ├── waiting-returns.ts        # CRUD retours attendus
    ├── flexible-events.ts        # Parsing evenements a periode flexible
    └── closure-comments.ts      # Helpers commentaires de cloture
```

---

## Conventions pour les IA

### A faire
- **Modifier un composant** : editer uniquement components/{feature}/NomComposant.tsx
- **Modifier la logique de donnees** : editer le hook useXxx.ts dans le dossier feature
- **Modifier les types globaux** : editer lib/types.ts
- **Modifier les couleurs/labels** : editer lib/utils.ts
- **Ajouter un composant** : creer dans le bon dossier components/{feature}/

### A eviter
- Ne jamais coller de logique business dans components/ui/ (composants purement graphiques)
- Ne jamais importer depuis components/ui/ProjectSelector, TaskSelector ou WaitingReturnSelector -> utiliser components/shared/
- Ne jamais modifier lib/supabase/ sans raison critique
- Ne jamais modifier src/middleware.ts sans comprendre la logique d'auth

### Taille attendue des fichiers
| Type | Taille max recommandee |
|---|---|
| pp/*/page.tsx (shell) | < 200 lignes |
| Composant UI | < 300 lignes |
| Hook de donnees | < 400 lignes |
| Composant complexe (dialog, workspace) | < 500 lignes |

---

## Commandes

```bash
npm run dev      # Developpement local (http://localhost:3000)
npm run build    # Build de production
npm run start    # Lancer le build de production
npm run lint     # Linter ESLint
```

## Variables d'environnement requises

Voir .env.example :
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Note build

Les erreurs prerender sur 
pm run build (TypeError: useContext) sont pre-existantes
et dues a un conflit de casse Windows (ureau vs Bureau dans le chemin node_modules).
Elles n'affectent pas le fonctionnement de l'application en mode developpement (
pm run dev).
