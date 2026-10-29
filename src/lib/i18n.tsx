import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getPref, setPref } from './db'
import type { DayClass, Prefs } from './types'

export type Lang = 'ar' | 'en'

const dict = {
  appName: { ar: 'مركز القيادة', en: 'Command Center' },
  dashboard: { ar: 'لوحة التحكم', en: 'Dashboard' },
  tracking: { ar: 'التتبع اليومي', en: 'Daily tracking' },
  progress: { ar: 'التقدّم', en: 'Progress' },
  activity: { ar: 'خريطة النشاط', en: 'Activity map' },
  projects: { ar: 'المشاريع', en: 'Projects' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  today: { ar: 'اليوم', en: 'Today' },
  quickAdd: { ar: 'إضافة سريعة', en: 'Quick add' },
  addEntry: { ar: 'أضف نشاطًا', en: 'Add entry' },
  minutes: { ar: 'الدقائق', en: 'Minutes' },
  note: { ar: 'ملاحظة', en: 'Note' },
  save: { ar: 'حفظ', en: 'Save' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  delete: { ar: 'حذف', en: 'Delete' },
  edit: { ar: 'تعديل', en: 'Edit' },
  done: { ar: 'مكتمل', en: 'Done' },
  focusedToday: { ar: 'وقت التركيز اليوم', en: 'Focused time today' },
  completedToday: { ar: 'مهام اليوم', en: "Today's tasks" },
  weeklyProgress: { ar: 'هدف الأسبوع', en: 'Weekly target' },
  streak: { ar: 'أيام متتالية', en: 'Day streak' },
  weekMinutes: { ar: 'ساعات هذا الأسبوع', en: 'Focus this week' },
  completionRate: { ar: 'نسبة الإنجاز', en: 'Completion rate' },
  consistency: { ar: 'مؤشر الاستمرارية', en: 'Consistency index' },
  consistencyHint: {
    ar: 'أيام نشطة ÷ أيام الفترة. مؤشر محسوب — ليس تقييم مهارة.',
    en: 'Active days ÷ period days. A computed index — not a skill rating.',
  },
  reflection: { ar: 'تأمل اليوم', en: 'Daily reflection' },
  reflectionPlaceholder: { ar: 'كيف كان يومك؟ ما الذي تعلمته؟', en: 'How was your day? What did you learn?' },
  dayQuality: { ar: 'تقييم اليوم', en: 'Day quality' },
  difficult: { ar: 'يوم صعب', en: 'Difficult day' },
  acceptable: { ar: 'يوم مقبول', en: 'Acceptable day' },
  good: { ar: 'يوم جيد', en: 'Good day' },
  exceptional: { ar: 'يوم استثنائي', en: 'Exceptional day' },
  suggested: { ar: 'مقترح', en: 'suggested' },
  manualOverride: { ar: 'يدوي', en: 'manual' },
  emptyToday: {
    ar: 'لا يوجد نشاط مسجّل بعد — أضف أول نشاط لبدء اليوم.',
    en: 'Nothing tracked yet — add your first entry to start the day.',
  },
  emptyChart: {
    ar: 'لا توجد بيانات كافية بعد. سيبدأ الرسم بالتكوّن منذ أول يوم تسجّل فيه.',
    en: 'Not enough data yet. The chart will build from your first logged day.',
  },
  metric: { ar: 'المقياس', en: 'Metric' },
  period: { ar: 'الفترة', en: 'Period' },
  daily: { ar: 'يومي', en: 'Daily' },
  weekly: { ar: 'أسبوعي', en: 'Weekly' },
  monthly: { ar: 'شهري', en: 'Monthly' },
  yearly: { ar: 'سنوي', en: 'Yearly' },
  comparePrevious: { ar: 'مقارنة بالفترة السابقة', en: 'Compare previous period' },
  measurable: { ar: 'قابل للقياس', en: 'Measurable' },
  computedIndex: { ar: 'مؤشر محسوب', en: 'Computed index' },
  focusedMinutes: { ar: 'دقائق التركيز', en: 'Focused minutes' },
  completedTasks: { ar: 'المهام المنجزة', en: 'Completed tasks' },
  qualityScore: { ar: 'درجة جودة اليوم', en: 'Day quality score' },
  qualityHint: { ar: 'صعب=1، مقبول=2، جيد=3، استثنائي=4', en: 'Difficult=1, Acceptable=2, Good=3, Exceptional=4' },
  last30: { ar: 'آخر 30 يومًا', en: 'Last 30 days' },
  last90: { ar: 'آخر 90 يومًا', en: 'Last 90 days' },
  lastYear: { ar: 'آخر سنة', en: 'Last year' },
  allTime: { ar: 'كل الفترة', en: 'All time' },
  legend: { ar: 'المفتاح', en: 'Legend' },
  less: { ar: 'أقل', en: 'Less' },
  more: { ar: 'أكثر', en: 'More' },
  noRecord: { ar: 'بدون تسجيل', en: 'No record' },
  weeklySummary: { ar: 'ملخص أسبوعي', en: 'Weekly summary' },
  weeklyReview: { ar: 'المراجعة الأسبوعية', en: 'Weekly review' },
  movedForward: { ar: 'ما الذي تقدّم؟', en: 'What moved forward?' },
  stalled: { ar: 'ما الذي توقف؟', en: 'What stalled?' },
  timeSpentQ: { ar: 'أين قضيت معظم الوقت؟', en: 'Where did most time go?' },
  nextMostImportant: { ar: 'أهم خطوة قادمة؟', en: 'Most important next action?' },
  status: { ar: 'الحالة', en: 'Status' },
  priority: { ar: 'الأولوية', en: 'Priority' },
  milestones: { ar: 'المعالم', en: 'Milestones' },
  nextAction: { ar: 'الخطوة التالية', en: 'Next action' },
  notes: { ar: 'ملاحظات', en: 'Notes' },
  timeInvested: { ar: 'الوقت المستثمر', en: 'Time invested' },
  active: { ar: 'نشط', en: 'Active' },
  paused: { ar: 'متوقف مؤقتًا', en: 'Paused' },
  doneStatus: { ar: 'منجز', en: 'Done' },
  archived: { ar: 'مؤرشف', en: 'Archived' },
  addProject: { ar: 'أضف مشروعًا', en: 'Add project' },
  addMilestone: { ar: 'أضف معلمًا', en: 'Add milestone' },
  theme: { ar: 'المظهر', en: 'Theme' },
  dark: { ar: 'داكن', en: 'Dark' },
  light: { ar: 'فاتح', en: 'Light' },
  language: { ar: 'اللغة', en: 'Language' },
  targets: { ar: 'الأهداف الأسبوعية (دقائق)', en: 'Weekly targets (minutes)' },
  exportData: { ar: 'تصدير البيانات', en: 'Export data' },
  importData: { ar: 'استيراد البيانات', en: 'Import data' },
  exportHint: {
    ar: 'نزّل نسخة JSON كاملة — ويمكن استيرادها على جهاز آخر لنقل بياناتك.',
    en: 'Download a full JSON backup — import it on another device to move your data.',
  },
  importResult: { ar: 'نتيجة الاستيراد', en: 'Import result' },
  categories: { ar: 'الفئات', en: 'Categories' },
  addCategory: { ar: 'أضف فئة', en: 'Add category' },
  customActivity: { ar: 'نشاط مخصص', en: 'Custom activity' },
  skip: { ar: 'تخطي اليوم', en: 'Skip today' },
  skipped: { ar: 'متخطّى', en: 'Skipped' },
  enable: { ar: 'تفعيل', en: 'Enable' },
  offlineReady: { ar: 'يعمل أوفلاين بالكامل', en: 'Fully offline-ready' },
  installHint: {
    ar: 'من متصفح الجوال: قائمة ⋮ ← "إضافة إلى الشاشة الرئيسية" لتثبيت التطبيق.',
    en: 'On mobile: browser menu → "Add to home screen" to install the app.',
  },
  range: { ar: 'النطاق', en: 'Range' },
  of_: { ar: 'من', en: 'of' },
  noData: { ar: 'لا توجد بيانات', en: 'No data' },
  deleteConfirm: { ar: 'تأكيد الحذف؟', en: 'Confirm delete?' },
  markTask: { ar: 'تسجيل مهمة', en: 'Log a task' },
  logTime: { ar: 'تسجيل وقت', en: 'Log time' },
  milestone: { ar: 'معلم', en: 'Milestone' },
  entryNote: { ar: 'ملاحظة', en: 'Note' },
  previousDays: { ar: 'الأيام السابقة', en: 'Previous days' },
  pickDate: { ar: 'اختر التاريخ', en: 'Pick a date' },
} as const

export type TKey = keyof typeof dict

interface I18n {
  lang: Lang
  dir: 'rtl' | 'ltr'
  t: (k: TKey) => string
  setLang: (l: Lang) => void
}

const Ctx = createContext<I18n>({ lang: 'ar', dir: 'rtl', t: (k) => dict[k].ar, setLang: () => {} })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar')
  useEffect(() => {
    getPref('lang').then((l) => setLangState(l))
  }, [])
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])
  const value = useMemo<I18n>(
    () => ({
      lang,
      dir,
      t: (k) => dict[k][lang],
      setLang: (l) => {
        setLangState(l)
        void setPref('lang', l)
      },
    }),
    [lang, dir],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)

export const DAY_CLASS_KEYS: Record<DayClass, TKey> = {
  difficult: 'difficult',
  acceptable: 'acceptable',
  good: 'good',
  exceptional: 'exceptional',
}

export const DAY_CLASS_COLORS: Record<DayClass, string> = {
  difficult: '#64748b',
  acceptable: '#38bdf8',
  good: '#34d399',
  exceptional: '#fbbf24',
}
