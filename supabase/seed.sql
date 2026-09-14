-- ============================================
-- Dashboard IT Fondax — Données initiales
-- Exécuter APRÈS schema.sql dans l'éditeur SQL Supabase
-- Source : Situation_IT_Fondax.md (septembre 2026)
-- ============================================

-- Nettoyage des tables pour réinsertion propre
TRUNCATE TABLE people, tasks, networks, network_equipment, network_connections, lan_devices, vendors, vendor_issues, events, computers, equipment, projects, notes CASCADE;

-- ============================
-- ORGANIGRAMME
-- ============================

INSERT INTO people (name, role, department, has_pc, has_m365, category) VALUES
('Jean-Baptiste TOUZE', 'Gérant', 'Direction', true, true, 'encadrant'),
('Angélique BUCCI', 'Responsable administrative et financière', 'Finance', true, true, 'encadrant'),
('Edouard MUNCH', 'Responsable Bureau d''études', 'Bureau d''études', true, true, 'encadrant'),
('Georges', 'Modéliste / Modelage', 'Modelage', true, true, 'encadrant'),
('Yoann PEDEL', 'Chef de Production', 'Production', true, true, 'encadrant'),
('Carole METAYER', 'Responsable QHSE', 'QHSE', true, true, 'encadrant'),
('Nicolas LE GALL', 'Responsable Supply', 'Supply Chain', true, true, 'encadrant'),
('Davy PRADO', 'Opérateur', 'Atelier', false, false, 'opérateur'),
('Florian CARDET', 'Opérateur', 'Atelier', false, false, 'opérateur'),
('Gaëtan COGREL', 'Opérateur', 'Atelier', false, false, 'opérateur'),
('Léo GUILLET', 'Opérateur', 'Atelier', false, false, 'opérateur'),
('Raphaël MAILLARD', 'Opérateur', 'Atelier', false, false, 'opérateur'),
('Aymeric DUFROST', 'Opérateur', 'Atelier', false, false, 'opérateur');

-- ============================
-- RÉSEAUX
-- ============================

INSERT INTO networks (ssid, ip_range, gateway, manager, role_status, notes, is_active) VALUES
('fondax wifi', '192.168.20.0/24', '192.168.20.254', 'Borne AP / Sophos', 'Wi-Fi interne de prod — à conserver pour tous les PC/tablettes d''entreprise, accès NAS Z: OK.', NULL, true),
('client fondax', '10.35.50.0/24', '10.35.50.254', 'Sophos (VLAN dédié)', 'Wi-Fi invité officiel, géré par Provectio.', NULL, true),
('wifi fondax fibre', '192.168.0.0/24', '192.168.0.254', 'Box SFR directe', 'Wi-Fi parasite non sécurisé, actif par défaut sans LAN.', 'En cours de désactivation — personne ne l''utilise.', true),
('Bureau', '192.168.68.0/24', '192.168.68.1', 'TP-Link Deco (x2, mesh)', 'Sous-réseau fantôme causé par double NAT.', '1 Deco repassé en mode AP, 2e à faire. Une fois les deux en AP, ce sous-réseau disparaît.', true);

-- ============================
-- ÉQUIPEMENTS RÉSEAU
-- ============================

INSERT INTO network_equipment (name, type, location, ip, role, notes, position_x, position_y) VALUES
('Box fibre SFR Business (ONT)', 'Modem/ONT', 'Baie réseau', NULL, 'WAN — Accès Internet', NULL, 400, 50),
('Firewall Sophos', 'Firewall', 'Baie réseau', '192.168.20.254', 'Sécurité / Routage', 'Modèle à confirmer. Accès admin direct impossible, pas de compte Sophos Central fourni.', 400, 200),
('Switch D-Link', 'Switch', 'Baie réseau', NULL, 'Distribution LAN', NULL, 400, 350),
('NAS Synology DS216', 'NAS', 'Baie réseau', '192.168.20.150', 'Stockage fichiers — Lecteur Z:', 'DSM bloqué en 6.2 (EOL oct. 2024). IP fixe confirmée. Problème coédition simultanée (limite SMB) → migration vers SharePoint.', 200, 500),
('Boîtier VoIP Yealink', 'VoIP', 'Baie réseau', NULL, 'Téléphonie', 'Étiquette asset "EM 12202"', 600, 500),
('TP-Link Deco 1', 'Point d''accès', 'Bureau', NULL, 'Wi-Fi Mesh', 'Repassé en mode Access Point ✅', 200, 650),
('TP-Link Deco 2', 'Point d''accès', 'Bureau', NULL, 'Wi-Fi Mesh', 'Encore en mode routeur ⚠️ — À repasser en AP', 600, 650);

-- Connexions réseau (à exécuter après insertion des équipements)
-- On utilise une transaction avec des variables pour récupérer les IDs
DO $$
DECLARE
  id_box UUID;
  id_fw UUID;
  id_sw UUID;
  id_nas UUID;
  id_voip UUID;
  id_deco1 UUID;
  id_deco2 UUID;
BEGIN
  SELECT id INTO id_box FROM network_equipment WHERE name LIKE 'Box fibre%';
  SELECT id INTO id_fw FROM network_equipment WHERE name LIKE 'Firewall%';
  SELECT id INTO id_sw FROM network_equipment WHERE name LIKE 'Switch%';
  SELECT id INTO id_nas FROM network_equipment WHERE name LIKE 'NAS%';
  SELECT id INTO id_voip FROM network_equipment WHERE name LIKE 'Boîtier VoIP%';
  SELECT id INTO id_deco1 FROM network_equipment WHERE name = 'TP-Link Deco 1';
  SELECT id INTO id_deco2 FROM network_equipment WHERE name = 'TP-Link Deco 2';

  INSERT INTO network_connections (source_id, target_id, label) VALUES
  (id_box, id_fw, 'WAN → Firewall'),
  (id_fw, id_sw, 'LAN → Switch principal'),
  (id_sw, id_nas, 'Connexion NAS'),
  (id_sw, id_voip, 'Connexion Téléphonie'),
  (id_sw, id_deco1, 'Vers Mesh Wi-Fi 1'),
  (id_deco1, id_deco2, 'Lien Mesh inter-Deco');
END $$;

-- ============================
-- APPAREILS LAN (192.168.20.0/24)
-- ============================

-- Lier au réseau fondax wifi
DO $$
DECLARE
  net_fondax UUID;
BEGIN
  SELECT id INTO net_fondax FROM networks WHERE ssid = 'fondax wifi';

  INSERT INTO lan_devices (ip, hostname, role, network_id) VALUES
  ('192.168.20.150', 'NAS-FONDAX.local', 'Serveur NAS Synology', net_fondax),
  ('192.168.20.140', 'IMC2000-1203', 'Imprimante/copieur Ricoh IM C2000', net_fondax),
  ('192.168.20.135', 'DESKTOP-A8FRQPS', 'Mon PC actuel (Fondax5) — à vérifier pour restes ancien utilisateur', net_fondax),
  ('192.168.20.82', 'PcNico35', 'PC de Nicolas Le Gall', net_fondax),
  ('192.168.20.148', 'DESKTOP-TUPCDOC', 'PC de bureau d''un collègue', net_fondax),
  ('192.168.20.143', 'ID-PF5QBHXE', 'Ordinateur portable Lenovo ThinkPad', net_fondax),
  ('192.168.20.79', 'Constructeur Espressif', 'Objet connecté atelier ou borne Wi-Fi — à identifier', net_fondax),
  ('192.168.20.142', 'Constructeur Espressif', 'Objet connecté IoT — à identifier', net_fondax),
  ('192.168.20.144', '—', 'Poste ou périphérique local à identifier', net_fondax),
  ('192.168.20.254', 'Passerelle', 'Routeur/pare-feu Sophos, géré Provectio', net_fondax);
END $$;

-- ============================
-- PRESTATAIRES
-- ============================

INSERT INTO vendors (name, scope, known_access, notes) VALUES
('Provectio', 
 'Infogérance Visionnaire (support utilisateur, 9 comptes) — Infogérance Infrastructures (cœur de réseau, support/backup) — Revente/gestion licences M365 (Apps for business, Business Basic, Business Standard) — Private VMware Cloud (200 Go stockage SAS) — Sophos Central Intercept X Essentials EDR (9 licences MSP)',
 'admin_provectio@fondax-sarl.fr — Agent NinjaRMM sur les postes',
 'La ligne "Cœur de réseau" facturée = support/backup Provectio, la gestion quotidienne du réseau est assurée en interne.'),
('Sophos',
 'Firewall on-premise (modèle à confirmer)',
 'Aucun — accès admin direct impossible, pas de compte Sophos Central fourni',
 'Accès à récupérer via Provectio');

-- Points ouverts Provectio
DO $$
DECLARE
  id_provectio UUID;
  id_sophos UUID;
BEGIN
  SELECT id INTO id_provectio FROM vendors WHERE name = 'Provectio';
  SELECT id INTO id_sophos FROM vendors WHERE name = 'Sophos';

  INSERT INTO vendor_issues (vendor_id, title, description, status) VALUES
  (id_provectio, 'Écart EDR Sophos', 'On paie 9 licences antivirus mais FONDAX GERANT et FONDAX EXPEDITION sont protégés par Windows Defender, pas Sophos. Utilité réelle mise en doute.', 'en attente'),
  (id_provectio, 'Accès Firewall', 'Accès admin au firewall Sophos toujours pas récupéré. Doit arriver bientôt.', 'en attente'),
  (id_provectio, 'Sauvegardes / Cloud VMware', 'Question posée sur l''utilisation réelle du stockage VMware Cloud 200 Go SAS. Réponse en attente.', 'en attente'),
  (id_provectio, 'Rationalisation outils distants', 'Multiplicité d''outils (TeamViewer, AnyDesk, GoToMeeting, Webex, Zoom, NinjaRMM). Point à clarifier pour rationaliser via NinjaRMM.', 'en attente'),
  (id_provectio, 'Formalisation GDAP M365', 'Formalisation de l''accès partenaire via GDAP.', 'en attente'),
  (id_provectio, 'Contrat / fiche de service', 'Demande du contrat ou fiche de service détaillée. Réponse en attente.', 'en attente'),
  (id_sophos, 'Accès admin firewall', 'Accès admin via IP + login direct impossible. Pas de compte Sophos Central fourni.', 'non résolu');
END $$;

-- ============================
-- POSTES INFORMATIQUES
-- ============================

INSERT INTO computers (name, user_name, os, antivirus_status, warranty_date, notes) VALUES
('Poste SPECTRO', NULL, 'Windows 7 32-bit', 'Aucun antivirus', NULL, 'Logiciel métier Qmatrix lié au spectromètre. Accès réseau conservé pour TeamViewer (support Cyril Provost). Comportement réseau réel inconnu — à investiguer.'),
('FONDAX GERANT', 'Jean-Baptiste TOUZE', 'Windows', 'Windows Defender (pas Sophos)', '2026-09-20', 'Garantie expirant le 20/09/2026.'),
('FONDAX EXPEDITION', NULL, 'Windows', 'Windows Defender (pas Sophos)', NULL, 'Protégé par Defender, pas par Sophos (écart avec les 9 licences facturées).'),
('Dell Inspiron 3470', NULL, 'Windows', 'Non vérifié', '2020-01-01', 'Garantie expirée depuis 2019/2020.'),
('Dell Inspiron 3668', NULL, 'Windows', 'Non vérifié', '2020-01-01', 'Garantie expirée depuis 2019/2020.'),
('DESKTOP-A8FRQPS (Fondax5)', 'Moi (alternant IT)', 'Windows', 'Non vérifié', NULL, 'Mon PC actuel. Poste recyclé — à vérifier pour restes d''un ancien utilisateur.'),
('Poste Maintenance', 'Christopher', 'Windows', 'Non vérifié', NULL, 'Identifiant atypique @outlook.fr — à clarifier.'),
('Poste Modelage', 'Georges', 'Windows', 'Non vérifié', NULL, 'Très peu renseigné dans l''audit.');

-- ============================
-- ÉQUIPEMENTS INFRASTRUCTURE
-- ============================

INSERT INTO equipment (name, type, model, location, characteristics, notes) VALUES
('Box fibre SFR Business', 'Modem/ONT', 'SFR Business ONT', 'Baie réseau', 'Fibre optique entreprise', NULL),
('Firewall Sophos', 'Firewall', 'Modèle à confirmer', 'Baie réseau', 'Entre la box SFR et le switch', 'Accès admin impossible. Pas de compte Sophos Central fourni.'),
('Switch D-Link', 'Switch', 'Modèle à confirmer', 'Baie réseau', 'Distribution LAN principale', NULL),
('NAS Synology DS216', 'NAS', 'DS216', 'Baie réseau', 'DSM 6.2 (EOL oct. 2024). IP fixe 192.168.20.150. Lecteur Z: sur tous les postes.', 'Problème coédition simultanée (limite SMB/Office). Se résout via migration SharePoint.'),
('Boîtier VoIP Yealink', 'VoIP', 'Yealink', 'Baie réseau', 'Étiquette asset "EM 12202"', NULL),
('Imprimante Ricoh IM C2000', 'Imprimante', 'IM C2000', 'Bureau', 'IP: 192.168.20.140', NULL);

-- ============================
-- TÂCHES
-- ============================

INSERT INTO tasks (title, description, category, status, priority) VALUES
-- Réseau
('Désactiver wifi fondax fibre sur interface SFR', 'Wi-Fi parasite non sécurisé, actif par défaut. Personne ne l''utilise.', 'Réseau', 'à faire', 'haute'),
('Repasser 2e Deco en mode AP', '1 Deco déjà repassé en AP. Le 2e est encore en mode routeur (double NAT, sous-réseau fantôme).', 'Réseau', 'à faire', 'haute'),
('Reconnecter PC tactile + tablettes au SSID fondax wifi', 'Actuellement sur réseau Bureau (Deco, double NAT, isolé du LAN). À faire une fois les 2 Deco en AP.', 'Réseau', 'à faire', 'moyenne'),
('Vérifier écart plage 192.168.102.0/24 vs 10.35.50.0/24', 'Ancienne fiche indiquait Fondax-Client en 192.168.102.0/24 — ne correspond pas à la plage officielle 10.35.50.0/24.', 'Réseau', 'à faire', 'moyenne'),
('Identifier appareils .79/.142 et .144 sur le LAN', 'Constructeur Espressif (objet connecté ou borne Wi-Fi) et poste inconnu à identifier.', 'Réseau', 'à faire', 'moyenne'),
('Investiguer comportement réseau poste SPECTRO', 'Pas encore déterminé si la machine W7 envoie/reçoit des données ou si elle est isolée.', 'Réseau', 'à faire', 'haute'),

-- Sécurité
('Trouver le poste avec Battle.net', 'Battle.net toujours présent sur un poste non identifié. À trouver et désinstaller.', 'Sécurité', 'à faire', 'moyenne'),
('Clarifier écart EDR Sophos avec Provectio', 'On paie des licences antivirus Sophos mais certains postes utilisent Windows Defender.', 'Sécurité', 'à faire', 'haute'),
('Récupérer accès firewall Sophos', 'Accès admin au firewall toujours pas récupéré. Point en attente côté Provectio.', 'Sécurité', 'en attente de retour externe', 'haute'),
('Formaliser accès GDAP M365', 'Formalisation de l''accès partenaire Provectio via GDAP.', 'Sécurité', 'à faire', 'moyenne'),
('Clarifier poste Maintenance (Christopher @outlook.fr)', 'Identifiant atypique @outlook.fr sur le poste Maintenance. À clarifier.', 'Sécurité', 'à faire', 'moyenne'),
('Évaluer Entra ID + Intune', 'Piste d''évolution : centraliser la gestion des identités et des postes via Entra ID + Intune (plus cohérent que AD on-prem).', 'Sécurité', 'à faire', 'moyenne'),

-- Stockage / SharePoint
('Clarifier sauvegardes / Cloud VMware', 'Question posée à Provectio sur l''utilisation réelle du Private VMware Cloud 200 Go SAS.', 'Stockage-SharePoint', 'en attente de retour externe', 'haute'),
('Finir renommage fichiers NAS', 'Tri du NAS en cours. Renommage des fichiers pas encore terminé.', 'Stockage-SharePoint', 'en cours', 'moyenne'),
('Points individuels avec chaque utilisateur', 'Point individuel prévu avec chaque utilisateur sur sa manière de gérer ses fichiers, avant de finaliser la structure SharePoint.', 'Stockage-SharePoint', 'à faire', 'moyenne'),

-- Prestataires
('Vérifier licences M365 inutilisées', 'Retrait pas encore fait. Vérifier au cas par cas qu''elles sont bien inutilisées avant suppression.', 'Prestataires', 'à faire', 'moyenne'),
('Obtenir contrat/fiche de service Provectio', 'Contrat ou fiche de service détaillée demandé à Provectio. Réponse en attente.', 'Prestataires', 'en attente de retour externe', 'haute'),
('Rationaliser outils distants via NinjaRMM', 'Multiplicité des outils distants (TeamViewer, AnyDesk, GoToMeeting, etc.) — rationaliser.', 'Matériel', 'à faire', 'moyenne'),

-- Cahier des charges
('Obtenir compte ALTIOR', 'Compte ALTIOR demandé, en attente de réception pour démarrer le chantier #1.', 'Cahier des charges', 'en attente de retour externe', 'haute');

-- ============================
-- ÉVÉNEMENTS
-- ============================

INSERT INTO events (title, description, event_date, event_type, status) VALUES
('RDV Yoann Pedel — Point tablettes et module Production', 'Point avec le chef de production sur les tablettes atelier et le module Production ALTIOR.', '2026-09-15 10:00:00+02', 'rdv', 'à venir'),
('Garantie poste gérant expire', 'La garantie du poste du gérant (JB Touze) expire le 20/09/2026.', '2026-09-20 00:00:00+02', 'échéance', 'à venir'),
('Reprise des cours (bachelor 3e année)', 'Reprise des cours en novembre 2026. Préparer la transition.', '2026-11-01 08:00:00+02', 'échéance', 'à venir'),
('Point Provectio — écart EDR, accès firewall, sauvegardes', 'Point à planifier avec Provectio pour clarifier les sujets ouverts.', '2026-09-16 09:00:00+02', 'appel', 'à venir');

-- ============================
-- CHANTIERS (Cahier des charges)
-- ============================

INSERT INTO projects (priority_order, name, description, status, notes_blockers) VALUES
(1, 'Finalisation de la digitalisation atelier', 'Tablettes + ERP ALTIOR, module Production. Reconnecter le PC tactile et les tablettes au bon réseau.', 'EN COURS', 'Compte ALTIOR demandé, en attente de réception. RDV calé avec Yoann Pedel. PC tactile et tablettes actuellement sur réseau Bureau (Deco, double NAT) — à reconnecter au SSID fondax wifi une fois les Deco en mode AP.'),
(2, 'Exploitation des données de chronométrage', 'Analyse de rentabilité basée sur les données de chronométrage.', 'À FAIRE', NULL),
(3, 'Diagnostic Lean terrain', 'VSM (Value Stream Mapping), spaghetti chart, identification des 7 muda.', 'À FAIRE', NULL),
(4, 'Réorganisation des stocks physiques', 'Réorganisation physique des zones de stockage.', 'À FAIRE', NULL),
(5, 'Stock numérique dans ALTIOR (consommables)', 'Mise en place du suivi numérique des consommables dans ALTIOR.', 'À FAIRE', NULL),
(6, 'Modules ERP complémentaires + chaîne YouTube interne', 'Planning/Gantt, Kanban, Suivi d''affaires dans ALTIOR. Création d''une chaîne YouTube interne pour tutoriels.', 'À FAIRE', NULL);

-- ============================
-- NOTES PERSONNELLES
-- ============================

INSERT INTO notes (title, content, category) VALUES
('Préparation ALTIOR', '<h2>Ressources</h2><ul><li>Chaîne YouTube officielle ALTIOR</li><li>Centre d''aide : community.altior.cloud</li><li>Module Production : OF, gammes, suivi de coulée</li></ul><h2>Questions à poser</h2><ul><li>Accès formation en ligne ?</li><li>Configuration tablettes atelier</li><li>Synchro avec données existantes</li></ul>', 'ERP'),
('Bases du Lean manufacturing', '<h2>Concepts clés</h2><ul><li><strong>VSM</strong> (Value Stream Mapping) — cartographier le flux de valeur</li><li><strong>Spaghetti chart</strong> — tracer les déplacements réels en atelier</li><li><strong>7 muda</strong> — surproduction, attentes, transports, surtraitement, stocks, mouvements, défauts</li></ul><h2>Application Fondax</h2><p>À adapter au contexte fonderie : coulée, moulage, parachèvement, contrôle.</p>', 'Lean'),
('Vocabulaire métier fonderie', '<h2>Termes courants</h2><ul><li><strong>OF</strong> — Ordre de Fabrication</li><li><strong>Gamme</strong> — séquence d''opérations pour produire une pièce</li><li><strong>Coulée</strong> — opération de versement du métal en fusion</li><li><strong>Nuance</strong> — composition chimique précise de l''alliage</li><li><strong>Parachèvement</strong> — opérations de finition post-coulée</li></ul>', 'Métier'),
('Architecture SharePoint — Notes', '<h2>Décision</h2><p>Architecture simplifiée à 2 sites (abandon du découpage à 4 ou 7 sites) :</p><ol><li><strong>Pôle Direction &amp; Finance</strong> — JB Touze + Angélique Bucci (privé, RGPD)</li><li><strong>Pôle Commun / Général</strong> — Tous les encadrants</li></ol><h2>Gouvernance</h2><ul><li>SharePoint = données chaudes (coédition quotidienne)</li><li>NAS Z: = données froides (archives &gt; 3 ans, sauvegardes)</li><li>OneDrive → SharePoint via "Déplacer vers" (cloud-to-cloud)</li><li>NAS → SharePoint via SPMT (local-to-cloud)</li></ul>', 'SharePoint');
