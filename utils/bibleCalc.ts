import { BIBLE_BOOKS, TOTAL_CHAPTERS } from '../constants';
import { PlanSettings, ReadingDay, OrderType, PlanMode, ScopeType } from '../types';

interface FlatChapter {
  bookName: string;
  chapterNum: number;
  isOT: boolean;
  globalIndex: number;
  bookIndex: number; // Added for easier range filtering
}

// Helper to flatten all bible chapters into a single array
const getFlatBible = (): FlatChapter[] => {
  let list: FlatChapter[] = [];
  let idx = 0;
  BIBLE_BOOKS.forEach((book, bookIdx) => {
    for (let c = 1; c <= book.chapters; c++) {
      list.push({
        bookName: book.name,
        chapterNum: c,
        isOT: book.isOT,
        globalIndex: idx++,
        bookIndex: bookIdx
      });
    }
  });
  return list;
};

const flattenList = getFlatBible();

export const calculateSchedule = (settings: PlanSettings): ReadingDay[] => {
  const startDate = new Date(settings.startDate);
  
  // 1. Determine Reading Sequence
  let readingSequence: FlatChapter[] = [];

  // Filter by Scope first
  let scopedList = [...flattenList];
  if (settings.scopeType === ScopeType.Range) {
    // Determine bounds
    const start = Math.min(settings.rangeStartBook, settings.rangeEndBook);
    const end = Math.max(settings.rangeStartBook, settings.rangeEndBook);
    
    scopedList = flattenList.filter(c => c.bookIndex >= start && c.bookIndex <= end);
    
    // For Range mode, we generally default to sequential to avoid confusion,
    // but we can respect order logic if needed. 
    // Usually "Custom Range" implies sequential reading of that range.
    readingSequence = [...scopedList];
  } else {
    // WHOLE BIBLE Logic
    if (settings.orderType === OrderType.NT_Start) {
      const firstNT = scopedList.findIndex(c => !c.isOT);
      if (firstNT !== -1) {
        const ntPart = scopedList.slice(firstNT);
        const otPart = scopedList.slice(0, firstNT);
        readingSequence = [...ntPart, ...otPart];
      } else {
        readingSequence = [...scopedList];
      }
    } else if (settings.orderType === OrderType.Custom) {
       // Start from specific book, then loop back
       // Find the first chapter of the start book
       const splitIdx = scopedList.findIndex(c => c.bookIndex === settings.startBookIndex);
       if (splitIdx !== -1) {
         const partA = scopedList.slice(splitIdx);
         const partB = scopedList.slice(0, splitIdx);
         readingSequence = [...partA, ...partB];
       } else {
         readingSequence = [...scopedList];
       }
    } else {
      // OT Start (Default) - Sequential
      readingSequence = [...scopedList];
    }
  }

  // 2. Determine Pace Strategy
  let totalTargetDays = 0;
  let isFixedDuration = false;

  if (settings.mode === PlanMode.Duration) {
    // Calculate end date based on months
    const targetEndDate = new Date(startDate);
    targetEndDate.setMonth(targetEndDate.getMonth() + settings.durationMonths);
    // Subtract 1 day to make it inclusive (e.g. Jan 1 to Jan 31 is 1 month)
    targetEndDate.setDate(targetEndDate.getDate() - 1);
    
    const diffTime = targetEndDate.getTime() - startDate.getTime();
    totalTargetDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    isFixedDuration = true;
  } else if (settings.mode === PlanMode.DateRange && settings.endDate) {
    const end = new Date(settings.endDate);
    const diffTime = end.getTime() - startDate.getTime();
    totalTargetDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    isFixedDuration = true;
  }

  // Safety check
  if (isFixedDuration && totalTargetDays <= 0) totalTargetDays = 1;

  // 3. Generate Days
  const schedule: ReadingDay[] = [];
  let currentChapterIdx = 0;
  let currentDate = new Date(startDate);
  let dayIndex = 0;
  const totalChapters = readingSequence.length;

  // Limit loop to avoid infinite crashes
  const maxDays = 365 * 10; 

  while (currentChapterIdx < totalChapters && dayIndex < maxDays) {
    let countForToday = settings.chaptersPerDay; // Default for 'ChaptersPerDay' mode

    if (isFixedDuration) {
      if (dayIndex >= totalTargetDays) {
        // We exceeded the target days but still have chapters?
        // Just read 1 per day until done to finish the list.
        countForToday = 1; 
      } else {
        // Smooth Distribution Algorithm
        // Calculates how many chapters we *should* have read by the end of today
        // and subtracts what we have *already* read.
        // This handles decimal paces (e.g., 3.25 chapters/day) by alternating 3 and 4.
        const progressRatio = (dayIndex + 1) / totalTargetDays;
        const expectedTotalRead = Math.round(progressRatio * totalChapters); 
        
        countForToday = expectedTotalRead - currentChapterIdx;
        if (countForToday < 0) countForToday = 0;
      }
    }
    
    // Clamp to remaining chapters
    if (currentChapterIdx + countForToday > totalChapters) {
      countForToday = totalChapters - currentChapterIdx;
    }

    const todayReadings: string[] = [];
    
    for (let i = 0; i < countForToday; i++) {
      const ch = readingSequence[currentChapterIdx];
      todayReadings.push(`${ch.bookName} ${ch.chapterNum}`);
      currentChapterIdx++;
    }

    // Format Date
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeekStr = ['日','一','二','三','四','五','六'][currentDate.getDay()];

    schedule.push({
      date: dateStr,
      dayOfWeek: dayOfWeekStr,
      readings: todayReadings,
      completed: false
    });

    // Next day
    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return schedule;
};