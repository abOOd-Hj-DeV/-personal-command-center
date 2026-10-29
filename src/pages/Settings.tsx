import { useRef, useState } from 'react'
import { Download, Plus, Smartphone, Upload } from 'lucide-react'
import { addCategory, updateCategory } from '@/lib/repo'
import { setPref } from '@/lib/db'
import { downloadJson, exportAll, importBundle, type ImportResult } from '@/lib/export'
import { todayISO } from '@/lib/dates'
import { useCategories, usePrefs } from '@/lib/hooks'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { Button, Card, CardTitle, Input, Segmented, Switch } from '@/components/ui'

const PALETTE = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#f87171', '#94a3b8']

export default function Settings() {
  const { t, lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()
  const categories = useCategories()
  const prefs = usePrefs()
  const fileRef = useRef<HTMLInputElement>(null)

  const [newCatAr, setNewCatAr] = useState('')
  const [newCatEn, setNewCatEn] = useState('')
  const [newColor, setNewColor] = useState(PALETTE[0])
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [activeMins, setActiveMins] = useState<string | null>(null)

  const doExport = async () => {
    const bundle = await exportAll()
    downloadJson(bundle, `command-center-backup-${todayISO()}.json`)
  }

  const doImport = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text())
      const res: ImportResult = await importBundle(raw)
      setImportMsg(
        `${Object.entries(res.imported)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ')} — skipped ${res.skipped}` +
          (res.errors.length ? ` — ${res.errors.length} errors` : ''),
      )
    } catch (e) {
      setImportMsg(String(e))
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight">{t('settings')}</h1>

      {/* appearance */}
      <Card>
        <CardTitle className="mb-3">{t('theme')}</CardTitle>
        <div className="flex flex-wrap gap-3 items-center">
          <Segmented
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'dark', label: t('dark') },
              { value: 'light', label: t('light') },
            ]}
          />
          <Segmented
            value={lang}
            onChange={setLang}
            options={[
              { value: 'ar', label: 'العربية' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>
        <p className="mt-3 text-[11px] text-[var(--text-3)] flex items-center gap-1.5">
          <Smartphone size={13} /> {t('installHint')}
        </p>
      </Card>

      {/* targets */}
      <Card>
        <CardTitle className="mb-1">{t('targets')}</CardTitle>
        <p className="text-[11px] text-[var(--text-3)] mb-3">
          {t('active')} — activeDayMinutes:
          <Input
            className="!w-16 !h-7 inline-block mx-2 text-center"
            type="number"
            value={activeMins ?? String(prefs.activeDayMinutes)}
            onChange={(e) => setActiveMins(e.target.value)}
            onBlur={() => {
              const v = parseInt(activeMins ?? '')
              if (v > 0) void setPref('activeDayMinutes', v)
            }}
          />
        </p>
        <div className="space-y-2.5">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3">
              <Switch
                checked={c.enabled}
                onChange={(v) => updateCategory(c.id, { enabled: v })}
              />
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
              <span className="flex-1 text-sm">{lang === 'ar' ? c.labelAr : c.labelEn}</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                className="!w-24 !h-8 text-center"
                defaultValue={prefs.weeklyTargets[c.id] ?? c.targetMinutesPerWeek ?? 0}
                onBlur={(e) => {
                  const v = parseInt(e.target.value) || 0
                  void setPref('weeklyTargets', { ...prefs.weeklyTargets, [c.id]: v })
                }}
              />
              <span className="text-[10px] text-[var(--text-3)] w-10">min/wk</span>
            </div>
          ))}
        </div>

        {/* add custom category */}
        <div className="mt-4 pt-3 border-t border-[var(--border-soft)]">
          <p className="text-xs font-medium muted mb-2">{t('addCategory')}</p>
          <div className="flex gap-2 flex-wrap items-center">
            <Input
              className="!w-36"
              placeholder="العربية"
              value={newCatAr}
              onChange={(e) => setNewCatAr(e.target.value)}
            />
            <Input
              className="!w-36"
              placeholder="English"
              value={newCatEn}
              onChange={(e) => setNewCatEn(e.target.value)}
            />
            <div className="flex gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="w-6 h-6 rounded-md cursor-pointer border-2"
                  style={{
                    background: c,
                    borderColor: newColor === c ? 'var(--text)' : 'transparent',
                  }}
                />
              ))}
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (newCatEn.trim() || newCatAr.trim()) {
                  void addCategory({
                    labelAr: newCatAr.trim() || newCatEn.trim(),
                    labelEn: newCatEn.trim() || newCatAr.trim(),
                    color: newColor,
                  })
                  setNewCatAr('')
                  setNewCatEn('')
                }
              }}
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>
      </Card>

      {/* data */}
      <Card>
        <CardTitle className="mb-2">{t('exportData')}</CardTitle>
        <p className="text-[11px] text-[var(--text-3)] mb-3 leading-relaxed">{t('exportHint')}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={doExport}>
            <Download size={14} /> {t('exportData')}
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> {t('importData')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void doImport(f)
              e.target.value = ''
            }}
          />
        </div>
        {importMsg && (
          <p className="mt-2 text-[11px] text-[var(--blue)]">
            {t('importResult')}: {importMsg}
          </p>
        )}
      </Card>
    </div>
  )
}
