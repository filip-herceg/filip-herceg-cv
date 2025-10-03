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

## Fokussierungsregeln (Agent)
- Immer Resultat pro Tag (PDFs/Links/Checks)
- Keine Over-Optimierung vor Meilenstein-Abschluss
- Blocking-Probleme: 2 Versuche, dann eskalieren
- Jede Änderung: Lint/Typecheck/Build kurz verifizieren
