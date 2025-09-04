'use client'
import React from 'react'

interface SectionInput { key: string; limit?: number }
interface ExportConfigDraft {
  id?: string
  name: string
  presetType?: string
  sections: SectionInput[]
  filters?: { projectSinceYear?: number; experienceSinceYear?: number }
  density?: 'normal' | 'compact'
  colorMode?: 'auto' | 'monochrome'
  paperSize?: 'A4' | 'Letter'
  version?: number
}
interface RecordRow extends ExportConfigDraft { id: string; version: number; createdAt: string; updatedAt: string }

function defaultDraft(): ExportConfigDraft {
  return { name: '', sections: [{ key: 'PROFILE' }, { key: 'SKILLS' }, { key: 'PROJECTS' }, { key: 'EXPERIENCE' }], density: 'normal', colorMode: 'auto', paperSize: 'A4' }
}

const sectionOptions = ['PROFILE','SKILLS','PROJECTS','EXPERIENCE','EDUCATION','CERTIFICATIONS','TRAITS','HOBBIES','CONTACT'] as const

type SectionEditorProps = Readonly<{ draft: ExportConfigDraft; setDraft: (d: ExportConfigDraft)=>void }>
function SectionEditor({ draft, setDraft }: SectionEditorProps) {
  function update(idx: number, patch: Partial<SectionInput>) {
    const next = [...draft.sections]
    next[idx] = { ...next[idx], ...patch }
    setDraft({ ...draft, sections: next })
  }
  function add() {
    const remaining = sectionOptions.find(k => !draft.sections.some(s => s.key === k))
    if (!remaining) return
    setDraft({ ...draft, sections: [...draft.sections, { key: remaining }] })
  }
  function remove(idx: number) { setDraft({ ...draft, sections: draft.sections.filter((_,i)=>i!==idx) }) }
  function move(idx: number, dir: -1 | 1) {
    const to = idx + dir; if (to < 0 || to >= draft.sections.length) return
    const next = [...draft.sections]; const [item] = next.splice(idx,1); next.splice(to,0,item)
    setDraft({ ...draft, sections: next })
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Sections</h4>
        <button type="button" onClick={add} className="text-xs px-2 py-1 border rounded hover:bg-accent">Add</button>
      </div>
      <ul className="space-y-1">
        {draft.sections.map((s,i)=> (
          <li key={s.key} className="flex items-center gap-2 text-xs border rounded px-2 py-1">
            <span className="font-mono">{i+1}.</span>
            <select aria-label={`Section ${i+1} key`} className="bg-transparent text-xs" value={s.key} onChange={e=>update(i,{ key:e.target.value })}>
              {sectionOptions.map(opt => <option key={opt} disabled={draft.sections.some(sec => sec.key === opt) && opt!==s.key}>{opt}</option>)}
            </select>
            <input aria-label={`Section ${i+1} limit`} className="w-16 border px-1 text-xs" placeholder="limit" value={s.limit ?? ''} onChange={e=>update(i,{ limit: e.target.value ? parseInt(e.target.value,10): undefined })} />
            <div className="ml-auto flex gap-1">
              <button type="button" aria-label="Move up" onClick={()=>move(i,-1)} className="px-1 border rounded">↑</button>
              <button type="button" aria-label="Move down" onClick={()=>move(i,1)} className="px-1 border rounded">↓</button>
              <button type="button" aria-label="Remove" onClick={()=>remove(i)} className="px-1 border rounded text-destructive">✕</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

type ClientProps = Readonly<{ initial: RecordRow[] }>
function Client({ initial }: ClientProps) {
  const [rows, setRows] = React.useState<RecordRow[]>(initial)
  const [draft, setDraft] = React.useState<ExportConfigDraft>(defaultDraft())
  const [mode, setMode] = React.useState<'list' | 'create' | 'edit'>('list')
  const [status, setStatus] = React.useState<string>('')

  async function refresh() {
    try {
      const res = await fetch('/api/export/configs', { cache: 'no-store' })
      if (res.ok) { const json = await res.json(); setRows(json.configs) }
    } catch {}
  }
  function startCreate() { setDraft(defaultDraft()); setMode('create'); setStatus('') }
  function startEdit(r: RecordRow) { setDraft({ ...r }); setMode('edit'); setStatus('') }
  async function submitCreate(e: React.FormEvent) {
    e.preventDefault(); setStatus('Saving...')
    try {
      const res = await fetch('/api/export/configs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      if (res.ok) { setStatus('Created'); await refresh(); setMode('list') } else { const j= await res.json(); setStatus(j.error||'Error') }
    } catch { setStatus('Network error') }
  }
  async function submitEdit(e: React.FormEvent) {
    e.preventDefault(); setStatus('Saving...')
    try {
      const body = { id: draft.id, version: draft.version, config: { ...draft } }
      const res = await fetch('/api/export/configs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.status === 409) { setStatus('Version conflict – refetching'); await refresh(); return }
      if (res.ok) { setStatus('Updated'); await refresh(); setMode('list') } else { const j= await res.json(); setStatus(j.error || 'Error') }
    } catch { setStatus('Network error') }
  }
  async function remove(r: RecordRow) {
    if (!confirm(`Delete config ${r.name}?`)) return
    setStatus('Deleting...')
    try {
      const res = await fetch('/api/export/configs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id }) })
      if (res.ok) { setStatus('Deleted'); await refresh() } else { const j = await res.json(); setStatus(j.error||'Error') }
    } catch { setStatus('Network error') }
  }

  const listView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Export Configs</h1>
        <button onClick={startCreate} className="border rounded px-3 py-1 text-sm hover:bg-accent">New</button>
      </div>
      <table className="w-full text-sm border">
        <thead className="bg-accent/40"><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Preset</th><th className="text-left p-2">Sections</th><th className="text-left p-2">Version</th><th className="text-left p-2">Updated</th><th className="p-2">Actions</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-2 font-medium">{r.name}</td>
              <td className="p-2">{r.presetType || '-'}</td>
              <td className="p-2 text-xs">{r.sections?.map((s: SectionInput)=>s.key).join(', ')}</td>
              <td className="p-2">{r.version}</td>
              <td className="p-2 text-xs">{new Date(r.updatedAt).toLocaleDateString()}</td>
              <td className="p-2 flex gap-2"><button onClick={()=>startEdit(r)} className="text-xs underline">Edit</button><button onClick={()=>remove(r)} className="text-xs text-destructive underline">Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No configs yet.</p>}
      {status && <p className="text-xs">{status}</p>}
    </div>
  )

  const formView = (kind: 'create' | 'edit') => (
    <form onSubmit={kind==='create'?submitCreate:submitEdit} className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">{kind === 'create' ? 'New Config' : `Edit ${draft.name}`}</h1><button type="button" onClick={()=>{ setMode('list'); setStatus('') }} className="text-sm underline">Back</button></div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <label className="space-y-1 col-span-2"><span className="block text-xs font-medium">Name</span><input required value={draft.name} onChange={e=>setDraft({ ...draft, name: e.target.value })} className="w-full border rounded px-2 py-1" /></label>
        <label className="space-y-1"><span className="block text-xs font-medium">Preset Type</span><select value={draft.presetType||''} onChange={e=>setDraft({ ...draft, presetType: e.target.value || undefined })} className="w-full border rounded px-2 py-1"><option value="">(none)</option><option>COMPREHENSIVE</option><option>CONCISE</option><option>LEADERSHIP</option><option>TECHNICAL</option></select></label>
  <label className="space-y-1"><span className="block text-xs font-medium">Density</span><select value={draft.density||'normal'} onChange={e=>setDraft({ ...draft, density: e.target.value as ExportConfigDraft['density'] })} className="w-full border rounded px-2 py-1"><option value="normal">Normal</option><option value="compact">Compact</option></select></label>
  <label className="space-y-1"><span className="block text-xs font-medium">Color Mode</span><select value={draft.colorMode||'auto'} onChange={e=>setDraft({ ...draft, colorMode: e.target.value as ExportConfigDraft['colorMode'] })} className="w-full border rounded px-2 py-1"><option value="auto">Auto</option><option value="monochrome">Monochrome</option></select></label>
  <label className="space-y-1"><span className="block text-xs font-medium">Paper Size</span><select value={draft.paperSize||'A4'} onChange={e=>setDraft({ ...draft, paperSize: e.target.value as ExportConfigDraft['paperSize'] })} className="w-full border rounded px-2 py-1"><option value="A4">A4</option><option value="Letter">Letter</option></select></label>
      </div>
      <fieldset className="space-y-2 border rounded p-3"><legend className="text-xs font-medium">Filters</legend><div className="grid grid-cols-2 gap-4 text-xs"><label className="space-y-1"><span className="block">Project Since Year</span><input type="number" value={draft.filters?.projectSinceYear ?? ''} onChange={e=>setDraft({ ...draft, filters: { ...(draft.filters||{}), projectSinceYear: e.target.value ? parseInt(e.target.value,10) : undefined } })} className="w-full border rounded px-2 py-1" /></label><label className="space-y-1"><span className="block">Experience Since Year</span><input type="number" value={draft.filters?.experienceSinceYear ?? ''} onChange={e=>setDraft({ ...draft, filters: { ...(draft.filters||{}), experienceSinceYear: e.target.value ? parseInt(e.target.value,10) : undefined } })} className="w-full border rounded px-2 py-1" /></label></div></fieldset>
      <SectionEditor draft={draft} setDraft={setDraft} />
      {mode === 'edit' && <p className="text-xs text-muted-foreground">Version: {draft.version}</p>}
      <div className="flex gap-2"><button type="submit" className="border rounded px-4 py-1 text-sm hover:bg-accent">{mode==='create' ? 'Create' : 'Save'}</button><button type="button" onClick={()=>{ setMode('list'); setStatus('') }} className="text-sm underline">Cancel</button></div>
      {status && <p className="text-xs">{status}</p>}
    </form>
  )

  return <main className="p-6 space-y-6">{mode === 'list' ? listView() : formView(mode)}</main>
}

export default Client
