# Bewerbungsreif Roadmap (Oktober 2025)

Ziel: In 5–7 Tagen vollständig bewerbungsreif mit 2–3 Rollen-Varianten, stabilen PDFs, geteilten Links, QA-Gates und Monitoring.

## Meilensteine & Akzeptanzkriterien

1) Inhalte finalisieren (Day 1)
- Kurzprofil (2–3 Sätze), messbare Highlights pro Projekt
- Varianten-Entscheid: Short vs. Vollversion (Welche Projekte/Skills)

2) Presets & PDFs (Day 1–2)
- 2–3 Presets pro Zielrolle (Sections/Filters/Design/Locale festgelegt)
- PDFs erzeugt: Dateinamen konsistent, QR-Footer aktiv (Share-Token)

3) Share-Links & Landing (Day 2)
- Tokenisierte Links pro Variante, Landing mit Kontakt-CTA
- Optional UTM-Parameter; Funktionsprüfung (200 OK, QR führt zur Landing)

4) QA-Gates & Performance (Day 2–3)
- Visuell: Playwright-Gates grün
- A11y: pa11y grün; Lighthouse PWA/SEO/BestPractices ≥ 90
- Determinismus geprüft (stabile PDFs über 2 Läufe)

5) Monitoring & Alerts (Day 3)
- Grafana-Dashboard Panels mit Daten
- PrometheusRule aktiv: busyRatio/failureRatio/p95/acquireP95/DOM p95/Bench p50

6) Deployment (Day 3–4)
- Helm-Templates in CI gerendert, Staging-Deployment mit Healthz OK
- /api/metrics erreichbar; min. 1 Replikat warm

7) Outreach-Kit (Day 4–5)
- 2–3 PDFs (Rollenvarianten) final
- E-Mail-Kurzvorlagen; LinkedIn/ATS-Textbausteine

## Status (Stand 4. Oktober 2025)

| Meilenstein | Status | Nächstes To-do |
| --- | --- | --- |
| Inhalte finalisieren | 🚧 WIP | Kurzprofil & Projekt-Highlights finalisieren, Review mit aktuellen Erfolgsmetriken |
| Presets & PDFs | ✅ | PDFs visuell gegentesten (Playwright Snapshots) & Benamsung final abnehmen |
| Share-Links & Landing | ✅ | Landing-CTA copy finalisieren, optional UTM-Parameter abstimmen |
| QA-Gates & Performance | 🚧 WIP | Playwright-Lauf ergänzen, Lighthouse in CI (Linux) durchlaufen lassen |
| Monitoring & Alerts | ✅ | Dashboards in Grafana einmal manuell prüfen, Alert-Firing-Test simulieren |
| Deployment | ✅ | GitHub Action „Deploy Staging“ mit `staging_base_url` Input ausführen |
| Outreach-Kit | ⏳ Offen | Rollen-spezifische PDFs final redigieren, Outreach-Templates erstellen |

## Nächste Schritte

- Inhalte-Workshop (max. 2 Stunden) für Kurzprofil und Projekt-Highlights einplanen.
- Playwright- und Lighthouse-Runs als Teil der täglichen QA-Gates automatisieren (Linux CI).
- Staging-Deployment per GitHub Action „Deploy Staging“ triggern (`staging_base_url` setzen) – Healthz & Metrics laufen automatisch mit.
- Outreach-Kit vorbereiten: PDF-Varianten prüfen, E-Mail-/LinkedIn-Templates entwerfen.

## Arbeitspakete (Detailplan)

### Inhalte finalisieren (Day 1)
- [ ] Kurzprofil-Workshop terminieren (je Rolle 3 Kernbotschaften + 2 Kennzahlen)
- [ ] Projekt-Highlights auf 3 messbare Outcomes verdichten (Revenue, Velocity, Teamgröße)
- [ ] Varianten-Matrix (Short vs. Vollversion) in `docs/product/specs/presets.md` aktualisieren
- [ ] Peer-Review & Lektoratsrunde (30 Min) einplanen

### QA-Gates & Performance (Day 2–3)
- [ ] Playwright-Snapshot-Lauf in CI (Linux) hinzufügen — Ziel: nightly + pre-release
- [ ] Lighthouse Autorun in CI mit Score-Gates ≥ 90 (PWA/SEO/BP) und Report-Upload prüfen
- [ ] PDF-Determinismus-Testskript 2× laufen lassen; Diff report in `reports/tests/`

### Deployment & Monitoring (Day 3–4)
- [x] Helm-Staging-Deploy via Action „Deploy Staging“ inkl. Healthz-Loop automatisieren (`staging_base_url` Input)
- [x] `/api/metrics` Smoke-Test im Workflow hinterlegen (curl + promtool check)
- [ ] Grafana-Dashboard visuell prüfen; Alertmanager testweise busyRatio > 0.9 auslösen

### Outreach-Kit (Day 4–5)
- [ ] PDFs (Full Stack, Leadership, ggf. Product) final QA + Dateibenennung „Filip-Herceg-[Role].pdf“
- [ ] E-Mail-Kurzvorlagen (Recruiter, Hiring Manager) in `docs/outreach/email-templates.md` draften
- [ ] LinkedIn/ATS-Textbausteine (Headline + 3 Bullet Highlights) in `docs/outreach/snippets.md` vorbereiten
- [ ] Optional: QR-Landing CTA-Text A/B-Varianten skizzieren

## Fokussierungsregeln (Agent)
- Immer Resultat pro Tag (PDFs/Links/Checks)
- Keine Over-Optimierung vor Meilenstein-Abschluss
- Blocking-Probleme: 2 Versuche, dann eskalieren
- Jede Änderung: Lint/Typecheck/Build kurz verifizieren
