
export enum PaperSize {
  P4x6 = '4x6', // 10 x 14.8 cm
  A5 = 'A5',    // 14.8 x 21 cm
  A4 = 'A4'     // 21 x 29.7 cm
}

export enum TimeFrame {
  Year = 'Year',
  Month = 'Month',
  Week = 'Week'
}

export enum PlanMode {
  ChaptersPerDay = 'ChaptersPerDay', // e.g. 3 chapters/day
  Duration = 'Duration', // e.g. Finish in 1 year
  DateRange = 'DateRange' // Finish by specific date
}

export enum ScopeType {
  All = 'All',
  Range = 'Range'
}

export enum OrderType {
  OT_Start = 'OT_Start', // Genesis -> Rev
  NT_Start = 'NT_Start', // Matt -> Rev -> Gen
  // Mixed removed as requested
  Custom = 'Custom' // Specific book start (Legacy, mostly superseded by Range but kept for 'All' mode flexibility)
}

export enum MarkerStyle {
  Checkbox = 'Checkbox',
  Circle = 'Circle',
  Underline = 'Underline',
  None = 'None'
}

export interface ReadingDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  readings: string[]; // e.g. ["Gen 1", "Gen 2"]
  completed: boolean;
}

export interface PlanSettings {
  paperSize: PaperSize;
  timeFrame: TimeFrame;

  // Date Settings
  startDate: string;
  endDate?: string; // Optional end date for DateRange mode

  // Scope Settings
  scopeType: ScopeType;
  rangeStartBook: number; // Index 0-65
  rangeEndBook: number; // Index 0-65

  // Logic Settings
  mode: PlanMode;
  chaptersPerDay: number;
  durationMonths: number;

  // Order Settings
  orderType: OrderType;
  startBookIndex: number; // 0-65 (Used for OrderType.Custom in 'All' mode)
}

export interface StyleSettings {
  fontFamily: string;
  themeColor: string; // Default/Primary color
  backgroundColor: string;
  backgroundImage: string | null;
  overlayOpacity: number; // 0.0 to 1.0
  title: string;
  subtitle?: string; // Custom subtitle text

  // Visual Marker
  markerStyle: MarkerStyle;

  // Advanced Text Styles
  titleColor?: string;
  titleScale: number; // Multiplier, e.g. 1.0
  contentColor?: string;
  contentScale: number; // Multiplier, e.g. 1.0
  lineHeight: number; // e.g. 1.2

  // Subtitle Settings
  subtitleScale?: number; // Multiplier, e.g. 1.0
  subtitleGap?: number; // Multiplier, e.g. 1.0
}

export interface BibleBook {
  name: string;
  abbr: string;
  chapters: number;
  isOT: boolean;
}