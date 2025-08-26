# Vision, Mission & Ziele

## Vision
Eine elegante, performante und durchsuchbare Web-Plattform, die den vollständigen beruflichen und persönlichen Werdegang einer Person als lebendigen, interaktiven Lebenslauf präsentiert – so konsistent und hochwertig, dass jede beliebige Teilmenge der Inhalte unmittelbar als ästhetisch identische Kurzfassung oder PDF exportiert werden kann.

## Mission
Wir ermöglichen es, alle relevanten CV‑Informationen – Skills, Tools, persönliche Angaben, Berufserfahrung, Ausbildung, Projekte, Hobbys, Soft Skills & Charaktereigenschaften – klar strukturiert, pflegbar, such- und filterbar aufzubereiten. Nutzer*innen (Betrachter) sollen schnell feststellen können, ob ein bestimmtes Kompetenz- oder Eigenschaftenprofil vorliegt. Eigentümer*innen (Autor) können aus der Gesamtheit flexibel fokussierte Kurzprofile zusammenstellen und pixelgetreu exportieren.

## Leitprinzipien
1. Struktur & Auffindbarkeit: Jedes Informationsfragment ist einer klaren Kategorie zugeordnet und durch Such-/Filterlogik schnell erreichbar.
2. Single Source of Truth: Alle Daten liegen in einer konsistenten Schema-basierten Quelle; Ableitungen (Kurzfassungen, PDF) generieren sich daraus verlustfrei.
3. Parität Voll ↔ Kurz: Die „Short CV“ Darstellung ist kein separates Theme, sondern eine gefilterte Projektion auf das Original-Layout.
4. Performance by Design: Serverseitige Datenaufbereitung, clientseitig nur minimal interaktive Hydratationsinseln; progressive Rendering & Caching.
5. Barrierearm & Druckreif: Lesbarkeit, semantische Struktur, dunkles & helles Theme, druckoptimiertes Layout identisch zum Bildschirm.
6. Erweiterbarkeit: Neue Kategorien oder Metadaten fügen sich ohne Bruch in Schema & UI ein.
7. Transparente Export-Optionen: Kontrollierte Parametrisierung (Auswahl-Sets, Layout-Optionen, evtl. Themen) ohne visuelle Drift.

## Zielgruppen
- Recruiter / Auftraggeber: Schnelles Matching spezifischer Anforderung mit dem Profil (Suchfunktion, Filter, Schlagworte).
- Eigentümer (Autor): Effizientes Kuratieren thematischer Kurzfassungen für Pitches, Rollen oder Branchen.
- Technische Reviewer: Einblick in Tech-Stack-/Tool-Bandbreite & Erfahrungs-Tiefe.

## Funktionale Hauptziele
| Ziel | Beschreibung | Erfolgskriterium |
|------|--------------|------------------|
| Vollständige Datenstruktur | Abdeckung aller geforderten Kategorien (Person, Skills, Tools, Erfahrung, Ausbildung, Projekte, Hobbys, Eigenschaften) in normalisierter Form | Schema-Version 1.0 eingefroren & dokumentiert |
| Kategorisierte Darstellung | UI-Komponenten für jede Kategorie, optional einklappbar / segmentiert | >95% Lighthouse Accessibility / Best Practices |
| Schnelle Suche & Filter | Freitext + Tag-basierte Filter (z.B. Skill-Typ, Seniorität, Tech-Domain) | <150ms Antwortzeit bei 95. Perzentil (lokal) |
| Interaktive Auswahl (Short Mode) | Mehrfachselektion von Entities (Skills/Projekte/etc.) für Kurzprofil | Persistente Query- oder Permalink-Funktion |
| Pixelgleicher PDF-Export | PDF spiegelt exakt den sichtbaren Zustand (Short oder Full) | Visuelle Diff < 2% Abweichung (Snapshot) |
| Export-Optionen | Parameter: Umfang (Sektionen), optional Sortierung, evtl. Sprach-/Themenumschaltung | Mind. 3 konfigurierbare Aspekte |
| Performance-Optimierung | SSR für initiale Daten; Code-Splitting; minimale Hydration | LCP < 1.8s (Desktop) / < 2.5s (Mobile Emu) |
| Barrierefreiheit | Semantische Landmarken, Tastaturbedienbarkeit, ausreichender Kontrast | Pa11y / aXe: keine kritischen Fehler |
| Logging & Diagnostik | RUM Web Vitals + strukturierte Logs | Aggregations-API liefert p50/p95 pro Metrik |

## Nicht‑Ziele (vorerst)
- User-Accounts oder Authentifizierung.
- Externe Datenbank-Persistenz / Multi-Tenant Betrieb.
- Kollaboratives Echtzeit-Editing.
- AI-basierte automatische CV-Zusammenfassungen (später möglich).
- Mehrsprachigkeit (Internationalisierung) – geplant für spätere Phase.

## Kurzfristige Meilensteine (0–2 Monate)
1. Finalisierung & Versionierung des CV-Schemas (JSON / TypeScript / Zod).  
2. Implementierung modularer Kategorien mit einklappbaren Sektionen.  
3. Volltext-/Tag-Suchindex (Client-optimiert, ggf. vorab generiert).  
4. Short-Mode Selektor (Skills / Projekte / Erfahrung) inkl. Permalink-Mechanik.  
5. Pixelparität: HTML-zu-PDF Pipeline (Puppeteer + CSS Print Styles) validiert.  
6. Basis-Exportoptionen (Sektionen an/aus, Sortierung).  
7. Performance & A11y Tuning Schleife (Lighthouse, Pa11y).  

## Mittelfristige Meilensteine (2–6 Monate)
1. Erweiterte Filter (Skill-Level, Zeiträume, Tech-Domains).  
2. Theming (Light/Dark/Print + optionale Farbvariante) konsolidiert.  
3. Mehrdimensionale Suchfacetten (Skill-Kategorie, Soft-Skill-Tags).  
4. Snapshot / Preset-System für vordefinierte Kurzprofile ("Consulting", "Frontend-Fokus" etc.).  
5. Optionaler PDF-Metadaten & Version-Stamp (Revisionsnachverfolgung).  
6. Vorbereitung i18n Grundgerüst.  
7. Export-Batch (mehrere Kurzprofile in einer Session).  

## Langfristige Perspektiven
- Anbindung externer Quellen (GitHub Repos, Blog Posts, Zertifikate).  
- Editor-UI / CMS Integration zur Live-Pflege.  
- Automatisierte Skill-Gruppierung via Embeddings / Semantik.  
- API-first Bereitstellung für Dritte (GraphQL/REST).  
- Versionierte CV Releases mit Vergleichsansicht.  

## Qualitätsmetriken
| Kategorie | Metrik | Ziel |
|-----------|-------|------|
| Performance | LCP | <2.0s (Median) |
| Performance | JS Payload (Initial) | <180KB gzip |
| Qualität | Test Coverage Statements | ≥95% (stabil) |
| A11y | Kritische Fehler (Pa11y) | 0 |
| Zuverlässigkeit | PDF Generierungs-Fehlerquote | <1% (manuelle Tests/Stubs) |
| Nutzbarkeit | Suchtreffer-Latenz | <100ms (Client) |

## Erfolgsindikatoren
- Schnelle Beantwortung spezifischer Recruiter-Fragen (z.B. "TypeScript & Accessibility?" → sofortige Treffer).  
- Reduktion der Zeit zur Erstellung einer maßgeschneiderten Kurzfassung auf <1 Minute.  
- Konsistente Optik zwischen Web & PDF ohne Nachbearbeitung.  
- Hohe Wiederverwendung von Komponenten (geringe Duplizierung / konsistente Styles).  

## Risikobereich & Mitigation
| Risiko | Einfluss | Mitigation |
|--------|----------|------------|
| Komplexes CSS für Pixelparität PDF | Layout-Brüche | Strikte Print CSS + visuelle Regressionstests (optional) |
| Wachsende Datenstruktur | Wartungsaufwand | Versioniertes Schema + Migrations-Utility |
| Performance-Degradation durch Client-Suche | LCP / TTI steigt | Vorindizierung + Web Worker (optional Phase 2) |
| Puppeteer Plattform-Inkompatibilitäten | PDF Ausfälle | Fallback Hinweis + Alternative (Serverless Chrome / Prebuild) |

## Zusammenfassung
Die Plattform bietet einen einzigen, strukturierten Wahrheitskern für alle CV-Daten und ermöglicht es, nahezu ohne Reibung zwischen vollständiger Darstellung und maßgeschneiderter Kurzfassung (inkl. PDF) zu wechseln – performant, erweiterbar und suchoptimiert.
