import {
  BedDouble,
  BriefcaseBusiness,
  Car,
  Compass,
  FileCheck2,
  Plane,
  PlaneTakeoff,
  Ship,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

const CATEGORY_ICONS: [RegExp, LucideIcon][] = [
  [/visa|passport|immigration/i, FileCheck2],
  [/flight|airline|ticket/i, Plane],
  [/hotel|lodging|accommodation/i, BedDouble],
  [/tour|excursion|safari/i, Compass],
  [/insurance/i, ShieldCheck],
  [/transfer|transport|pickup|car/i, Car],
  [/charter|private jet/i, PlaneTakeoff],
  [/cruise/i, Ship],
  [/corporate|business/i, BriefcaseBusiness],
]

export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS.find(([re]) => re.test(category))?.[1] ?? Compass
}

// Curated discovery categories shown when the database has no listings yet.
// These are navigation affordances only; the marketplace itself never
// fabricates results.
export const FALLBACK_CATEGORIES = [
  'Visa Assistance',
  'Flight Tickets',
  'Hotels',
  'Tours',
  'Travel Insurance',
  'Airport Transfer',
  'Charter',
  'Cruise',
  'Corporate Travel',
]