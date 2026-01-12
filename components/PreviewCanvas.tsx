import React, { useMemo, useEffect } from 'react';
import { PlanSettings, StyleSettings, MarkerStyle, PaperSize } from '../types';
import { PAPER_DIMENSIONS, BIBLE_BOOKS } from '../constants';
import { calculateSchedule } from '../utils/bibleCalc';

interface PreviewCanvasProps {
  planSettings: PlanSettings;
  styleSettings: StyleSettings;
  scale?: number; // For preview zooming
  className?: string;
  onPageCountChange?: (count: number) => void;
}

// Helper to format text
const formatReadingText = (readings: string[]): string => {
  if (readings.length === 0) return '';
  const parsed = readings.map(r => {
    const [bookName, chapter] = r.split(' ');
    const book = BIBLE_BOOKS.find(b => b.name === bookName);
    return {
      bookName,
      abbr: book ? book.abbr : bookName.substring(0, 2),
      chapter: parseInt(chapter)
    };
  });

  let result = '';
  let currentBook = '';
  let startChapter = 0;
  let lastChapter = 0;

  parsed.forEach((p, idx) => {
    if (p.bookName !== currentBook) {
      if (currentBook) {
        // Check if previous book was single chapter
        const prevBookData = BIBLE_BOOKS.find(b => b.name === currentBook);
        const isSingleChapter = prevBookData && prevBookData.chapters === 1;

        if (!isSingleChapter) {
           result += `${startChapter === lastChapter ? startChapter : `${startChapter}-${lastChapter}`}`;
        } else {
           // If single chapter, remove the trailing space we added after abbr
           result = result.trimEnd();
        }
        result += "; ";
      }
      currentBook = p.bookName;
      result += `${p.abbr} `;
      startChapter = p.chapter;
      lastChapter = p.chapter;
    } else {
      if (p.chapter === lastChapter + 1) {
        lastChapter = p.chapter;
      } else {
        result += `${startChapter === lastChapter ? startChapter : `${startChapter}-${lastChapter}`},`;
        startChapter = p.chapter;
        lastChapter = p.chapter;
      }
    }
  });
  if (currentBook) {
     const prevBookData = BIBLE_BOOKS.find(b => b.name === currentBook);
     const isSingleChapter = prevBookData && prevBookData.chapters === 1;
     
     if (!isSingleChapter) {
        result += `${startChapter === lastChapter ? startChapter : `${startChapter}-${lastChapter}`}`;
     } else {
        result = result.trimEnd();
     }
  }
  return result;
};

// Helper to calculate visual length: CJK = 1, ASCII/Num = 0.55
const getVisualLength = (str: string): number => {
  let len = 0;
  for (const char of str) {
    // Check for CJK characters range
    if (char.match(/[\u3000-\u9fff\uac00-\ud7af\uff01-\uff60]/)) {
      len += 1;
    } else {
      len += 0.55;
    }
  }
  return len;
};

// Adaptive Column Logic
const getAdaptiveCols = (size: PaperSize, contentScale: number): number => {
  const isLargeFont = contentScale > 1.1;

  switch (size) {
    case PaperSize.P4x6:
      return isLargeFont ? 3 : 4;
    case PaperSize.A5:
      return isLargeFont ? 4 : 5;
    case PaperSize.A4:
      return isLargeFont ? 5 : 6;
    default:
      return 4;
  }
};

// Adaptive Base Font Size Logic
const getBaseFontSize = (size: PaperSize): number => {
  switch (size) {
    case PaperSize.P4x6:
      return 30; // Approx 1.25x of original 24px
    case PaperSize.A5:
      return 38; // Approx 1.6x of original 24px
    case PaperSize.A4:
      return 38; // Approx 1.6x of original 24px
    default:
      return 24;
  }
};

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({ 
  planSettings, 
  styleSettings, 
  scale = 1,
  className = "",
  onPageCountChange
}) => {
  
  // 1. Prepare Schedule Data
  const schedule = useMemo(() => {
    const rawSchedule = calculateSchedule(planSettings);
    return rawSchedule.map(d => {
      const text = formatReadingText(d.readings);
      return {
        ...d,
        formattedReading: text,
        colSpan: 1 // FORCE 1 Column
      };
    });
  }, [planSettings]);

  const paperDim = PAPER_DIMENSIONS[planSettings.paperSize];

  // --- Layout Calculation ---
  const pagination = useMemo(() => {
    const totalItems = schedule.length;
    if (totalItems === 0) return { pages: [], layout: {} as any };

    const marginPct = 0.05; 
    const marginX = paperDim.width * marginPct;
    const marginY = paperDim.height * marginPct;
    
    // Header
    const effectiveTitleScale = styleSettings.titleScale ?? 1;
    const baseTitleSize = Math.max(24, paperDim.height * 0.035); 
    const titleSize = baseTitleSize * effectiveTitleScale;
    const subTitleSize = Math.max(12, titleSize * 0.35);
    
    const titleLineHeight = 1.2;
    const subTitleGap = 8;
    const headerBottomPadding = paperDim.height * 0.02;

    const calculatedHeaderH = (titleSize * titleLineHeight) + subTitleGap + (subTitleSize * titleLineHeight) + headerBottomPadding;
    const footerH = Math.max(paperDim.height * 0.03, 50);

    const safeW = paperDim.width - (marginX * 2);
    const safeH = paperDim.height - (marginY * 2) - calculatedHeaderH - footerH;
    const gap = Math.max(6, paperDim.width * 0.006);

    const BASE_FONT = getBaseFontSize(planSettings.paperSize);
    const targetFontSize = BASE_FONT * styleSettings.contentScale;
    const lineHeight = styleSettings.lineHeight || 1.2;
    
    const estimatedLines = 1.3; 
    // Header Date/Day takes approx 1.0em + padding
    const dateHeaderHeight = targetFontSize * 0.9; 
    const requiredEmHeight = 0.3 + (dateHeaderHeight / targetFontSize) + 0.2 + (estimatedLines * lineHeight) + 0.3;
    const requiredPxHeight = targetFontSize * requiredEmHeight;

    const cols = getAdaptiveCols(planSettings.paperSize, styleSettings.contentScale);
    
    const cellW = (safeW - (gap * (cols - 1))) / cols;
    const maxRows = Math.floor((safeH + gap) / (requiredPxHeight + gap));
    const actualCellH = maxRows > 0 ? (safeH - (gap * (maxRows - 1))) / maxRows : requiredPxHeight;

    const layout = {
        cols,
        rows: maxRows,
        fontSize: targetFontSize,
        cellW,
        cellH: actualCellH,
        gap,
        headerH: calculatedHeaderH,
        footerH,
        marginX,
        marginY,
        safeH,
        titleSize,
        subTitleSize,
        subTitleGap
    };

    if (maxRows < 1) {
        return { pages: [schedule], layout }; 
    }

    // Pagination
    const pagesArray: any[][] = [];
    let currentPage: any[] = [];
    let currentRow = 0;
    let currentCol = 0;

    schedule.forEach(day => {
        if (currentCol + 1 > cols) {
            currentRow++;
            currentCol = 0;
        }
        if (currentRow >= maxRows) {
            pagesArray.push(currentPage);
            currentPage = [];
            currentRow = 0;
            currentCol = 0;
        }
        currentPage.push({ ...day, colSpan: 1 });
        currentCol += 1;
    });

    if (currentPage.length > 0) {
        pagesArray.push(currentPage);
    }

    return {
        pages: pagesArray,
        layout
    };

  }, [schedule, paperDim, planSettings.paperSize, styleSettings.contentScale, styleSettings.lineHeight, styleSettings.titleScale]);

  useEffect(() => {
    if (onPageCountChange) {
        onPageCountChange(pagination.pages.length);
    }
  }, [pagination.pages.length, onPageCountChange]);

  // --- Styles ---
  
  const wrapperStyle = (pageIndex: number): React.CSSProperties => ({
    width: `${paperDim.width * scale}px`,
    height: `${paperDim.height * scale}px`,
    position: 'relative',
    marginBottom: scale === 1 ? '0' : '12px',
    boxShadow: scale === 1 ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    pageBreakAfter: pageIndex < pagination.pages.length - 1 ? 'always' : 'auto'
  });

  const innerPageStyle: React.CSSProperties = {
    width: `${paperDim.width}px`,
    height: `${paperDim.height}px`,
    backgroundColor: styleSettings.backgroundColor,
    color: styleSettings.themeColor,
    position: 'absolute',
    top: 0, 
    left: 0,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    fontFamily: styleSettings.fontFamily,
    boxSizing: 'border-box',
    overflow: 'hidden'
  };

  const bgImageStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: styleSettings.backgroundImage ? `url(${styleSettings.backgroundImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    zIndex: 0,
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    opacity: styleSettings.overlayOpacity,
    zIndex: 1,
  };

  const mainLayoutStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 10,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: `${pagination.layout.marginY}px ${pagination.layout.marginX}px`,
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${pagination.layout.cols}, 1fr)`,
    gridAutoRows: `${pagination.layout.cellH}px`, 
    gap: `${pagination.layout.gap}px`,
    alignContent: 'start', 
  };

  // Content Styles
  const contentFontSize = pagination.layout.fontSize;
  const contentColor = styleSettings.contentColor || styleSettings.themeColor;
  const dateFontSize = Math.max(9, contentFontSize * 0.55); 
  // INCREASED PADDING: was 0.28, now 0.5 and min 8px for more breathing room
  const cellPad = Math.max(8, contentFontSize * 0.5); 

  const cellStyle: React.CSSProperties = {
    position: 'relative',
    height: `${pagination.layout.cellH}px`,
    display: 'flex',
    flexDirection: 'column',
    padding: 0, 
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: '4px',
    backgroundColor: 'rgba(255,255,255,0.4)',
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderColor: styleSettings.themeColor ? `${styleSettings.themeColor}25` : 'rgba(0,0,0,0.1)' 
  };

  const renderMarker = (marginTop: number) => {
    const size = contentFontSize * 0.85; 
    const style = { 
        width: size, 
        height: size, 
        marginRight: size * 0.4, 
        flexShrink: 0, 
        borderColor: contentColor, 
        marginTop: marginTop 
    };
    const commonClass = "inline-block border opacity-80 border-2"; 
    
    // Use styleSettings.markerStyle instead of planSettings.markerStyle
    switch (styleSettings.markerStyle) {
      case MarkerStyle.Checkbox: return <span style={style} className={commonClass}></span>;
      case MarkerStyle.Circle: return <span style={style} className={`${commonClass} rounded-full`}></span>;
      case MarkerStyle.Underline: return <span style={{ ...style, height: 2, alignSelf: 'flex-start', marginTop: marginTop + size, width: size * 1.5 }} className="inline-block border-b-2 opacity-80"></span>;
      default: return null;
    }
  };

  return (
    <div className={className} style={{ 
        width: paperDim.width * scale,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
      
      {pagination.pages.map((pageItems, pageIndex) => (
        <div 
          key={pageIndex} 
          style={wrapperStyle(pageIndex)}
          className="bg-white print:block print:w-full print:h-full print:shadow-none print:mb-0 bible-plan-page-export"
        >
          <div style={innerPageStyle}>
             {styleSettings.backgroundImage && <div style={bgImageStyle}></div>}
             {styleSettings.backgroundImage && <div style={overlayStyle}></div>}

            <div style={mainLayoutStyle}>
              <div style={{ 
                  height: `${pagination.layout.headerH}px`, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'flex-start',
                  alignItems: 'center', 
                  textAlign: 'center',
              }}>
                <h1 style={{ 
                  fontSize: `${pagination.layout.titleSize}px`, 
                  fontWeight: 800, 
                  lineHeight: 1.2, 
                  letterSpacing: '0.05em',
                  color: styleSettings.titleColor || styleSettings.themeColor,
                  marginTop: 0 
                }}>
                  {styleSettings.title || '讀經進度'}
                </h1>
                <p style={{ 
                  fontSize: `${pagination.layout.subTitleSize}px`, 
                  fontWeight: 400, 
                  opacity: 0.75, 
                  marginTop: `${pagination.layout.subTitleGap}px`,
                  color: styleSettings.titleColor || styleSettings.themeColor
                }}>
                  {styleSettings.subtitle 
                    ? styleSettings.subtitle 
                    : (pageItems.length > 0 ? `${pageItems[0].date} — ${pageItems[pageItems.length-1].date}` : '')
                  }
                </p>
              </div>

              <div style={gridStyle}>
                {pageItems.map((day, idx) => {
                  
                  // --- ALWAYS SHRINK MODE LOGIC ---
                  let fontSizeMultiplier = 1;

                  // 1. Available width calculation
                  const markerWidthWithMargin = contentFontSize * 0.85 + (contentFontSize * 0.85 * 0.4); 
                  const availableWidth = pagination.layout.cellW - (cellPad * 2) - markerWidthWithMargin - 4;
                  
                  // 2. Visual Length Calculation
                  const visualLength = getVisualLength(day.formattedReading);
                  const estimatedPixelWidth = visualLength * contentFontSize;
                  
                  if (estimatedPixelWidth > availableWidth) {
                     fontSizeMultiplier = availableWidth / estimatedPixelWidth;
                     // Cap the minimum size
                     fontSizeMultiplier = Math.max(0.4, fontSizeMultiplier);
                  }

                  const appliedFontSize = contentFontSize * fontSizeMultiplier; 
                  
                  // Marker Alignment
                  const lineHeightValue = styleSettings.lineHeight || 1.2;
                  const linePixelHeight = appliedFontSize * lineHeightValue;
                  const markerSize = contentFontSize * 0.85;
                  const markerMarginTop = Math.max(0, (linePixelHeight - markerSize) / 2);

                  return (
                    <div key={idx} style={cellStyle}>
                      {/* Header Row: Date & Stylized Day Badge */}
                      <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'stretch',
                          marginBottom: '4px',
                          borderBottom: '1px solid rgba(0,0,0,0.03)',
                      }}>
                         {/* Date: Top Left */}
                         <div style={{
                             padding: `${cellPad * 0.6}px ${cellPad}px`,
                             fontSize: `${dateFontSize}px`,
                             fontWeight: 600,
                             opacity: 0.7,
                             color: contentColor
                         }}>
                            {day.date.split('-').slice(1).join('/')}
                         </div>

                         {/* Day: Top Right Geometric Badge */}
                         <div style={{
                             backgroundColor: styleSettings.themeColor ? `${styleSettings.themeColor}15` : 'rgba(0,0,0,0.05)',
                             color: styleSettings.themeColor || contentColor,
                             fontSize: `${dateFontSize * 0.9}px`,
                             padding: `0 ${cellPad * 0.8}px`,
                             display: 'flex',
                             alignItems: 'center',
                             borderBottomLeftRadius: '8px',
                             fontWeight: 600
                         }}>
                            {day.dayOfWeek}
                         </div>
                      </div>

                      {/* Content Area */}
                      <div style={{
                          flex: 1,
                          padding: `0 ${cellPad}px ${cellPad}px ${cellPad}px`,
                          fontSize: `${appliedFontSize}px`,
                          fontWeight: 700, 
                          lineHeight: lineHeightValue, 
                          whiteSpace: 'nowrap',
                          wordBreak: 'normal',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center', // Vertically center content if space allows
                          flexDirection: 'column', 
                          color: contentColor,
                          overflow: 'hidden'
                      }}>
                         <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
                            {renderMarker(markerMarginTop)}
                            <span style={{ marginTop: 0 }}>
                              {day.formattedReading || '休息'}
                            </span>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ 
                  marginTop: 'auto', 
                  paddingTop: '8px', 
                  display: 'flex',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  gap: '12px',
                  opacity: 0.4, 
                  fontSize: `${Math.max(10, pagination.layout.fontSize * 0.45)}px` 
              }}>
                 {pagination.pages.length > 0 && (
                   <span className="font-mono bg-black/5 px-2 py-0.5 rounded text-[0.9em]">
                     {pageIndex + 1} / {pagination.pages.length}
                   </span>
                 )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};