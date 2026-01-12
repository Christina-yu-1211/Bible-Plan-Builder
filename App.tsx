import React, { useState, useRef, useEffect } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { StylePanel } from './components/StylePanel';
import { PreviewCanvas } from './components/PreviewCanvas';
import { PlanSettings, StyleSettings, PaperSize, TimeFrame, PlanMode, OrderType, MarkerStyle, ScopeType } from './types';
import { PAPER_DIMENSIONS, BIBLE_BOOKS } from './constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import FileSaver from 'file-saver';

const App: React.FC = () => {
  const [tab, setTab] = useState<'config' | 'style'>('config');
  const [zoom, setZoom] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Export States
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Default Date: Today + 1 Year
  const today = new Date();
  const nextYear = new Date(today);
  nextYear.setFullYear(today.getFullYear() + 1);
  const todayStr = today.toISOString().split('T')[0];
  const nextYearStr = nextYear.toISOString().split('T')[0];

  // Default States
  const [planSettings, setPlanSettings] = useState<PlanSettings>({
    paperSize: PaperSize.P4x6,
    timeFrame: TimeFrame.Month,
    startDate: todayStr,
    endDate: nextYearStr,

    // New Scope defaults
    scopeType: ScopeType.All,
    rangeStartBook: 0, // Genesis
    rangeEndBook: 65, // Revelation

    mode: PlanMode.ChaptersPerDay,
    chaptersPerDay: 3,
    durationMonths: 12,
    orderType: OrderType.OT_Start,
    startBookIndex: 0
  });

  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    fontFamily: "'Noto Sans TC', sans-serif",
    themeColor: '#334155', // Slate-700
    backgroundColor: '#ffffff',
    backgroundImage: null,
    overlayOpacity: 0.85,
    title: '每日讀經計畫',
    subtitle: '', // Default empty to use auto-date
    markerStyle: MarkerStyle.Checkbox,
    titleScale: 1.0,
    contentScale: 1.0,
    lineHeight: 1.2
  });

  // Generic Export Logic
  const handleExport = async (format: 'pdf' | 'png' | 'jpeg') => {
    setIsExportMenuOpen(false);
    if (!printContainerRef.current) return;

    setIsExporting(true);
    setExportProgress('準備生成中...');

    try {
      // 1. Setup Container
      const container = printContainerRef.current;
      const originalClass = container.className;

      // Temporarily render visibly but off-screen to ensure html2canvas works (it needs DOM visibility)
      container.className = "fixed top-0 left-0 z-[-100]";

      // 2. Select individual pages
      // Note: We added the class 'bible-plan-page-export' in PreviewCanvas.tsx
      const pages = container.querySelectorAll('.bible-plan-page-export');

      if (pages.length === 0) {
        throw new Error("No pages found to export");
      }

      // 3. Prepare dimensions for PDF
      const dim = PAPER_DIMENSIONS[planSettings.paperSize];

      // Convert pixels (300dpi ish) to mm for jsPDF
      // P4x6 (100x148mm), A5(148x210mm), A4(210x297mm)
      let pdfFormat: [number, number];
      if (planSettings.paperSize === PaperSize.P4x6) pdfFormat = [100, 148];
      else if (planSettings.paperSize === PaperSize.A5) pdfFormat = [148, 210];
      else pdfFormat = [210, 297]; // A4

      // Initialize PDF or ZIP
      let doc: jsPDF | null = null;
      let zip: JSZip | null = null;

      if (format === 'pdf') {
        // Create PDF doc
        doc = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: pdfFormat,
          compress: true
        });
      } else {
        // Create Zip
        zip = new JSZip();
      }

      // 4. Iterate and Capture
      for (let i = 0; i < pages.length; i++) {
        setExportProgress(`正在處理第 ${i + 1} / ${pages.length} 頁...`);

        // Wait a tiny bit to let UI update
        await new Promise(r => setTimeout(r, 10));

        const pageEl = pages[i] as HTMLElement;

        const canvas = await html2canvas(pageEl, {
          scale: 2, // High resolution
          useCORS: true,
          backgroundColor: styleSettings.backgroundColor
        });

        const imgData = canvas.toDataURL(format === 'pdf' ? 'image/jpeg' : `image/${format}`, 0.9);

        if (format === 'pdf' && doc) {
          if (i > 0) doc.addPage(pdfFormat, 'p');
          doc.addImage(imgData, 'JPEG', 0, 0, pdfFormat[0], pdfFormat[1]);
        } else if (zip) {
          // Remove header for zip blob
          const base64Data = imgData.split(',')[1];
          // 0-pad the filename (page-01.jpg)
          const fileName = `page-${String(i + 1).padStart(2, '0')}.${format}`;
          zip.file(fileName, base64Data, { base64: true });
        }
      }

      // 5. Save File
      setExportProgress('打包下載中...');
      const dateStr = planSettings.startDate;

      if (format === 'pdf' && doc) {
        doc.save(`讀經計畫-${dateStr}.pdf`);
      } else if (zip) {
        const content = await zip.generateAsync({ type: "blob" });
        // Handle default export of file-saver
        // @ts-ignore
        const saveAs = FileSaver.saveAs || FileSaver;
        saveAs(content, `讀經計畫-${dateStr}.zip`);
      }

      // Restore style
      container.className = originalClass;

    } catch (err) {
      console.error("Export failed:", err);
      alert("匯出失敗，請稍後再試。");
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  // Responsive preview scaling
  const paperDim = PAPER_DIMENSIONS[planSettings.paperSize];
  const baseScale = 340 / paperDim.width;
  const displayScale = baseScale * zoom;

  // Track Current Page via Scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop } = scrollContainerRef.current;

    const pageHeight = paperDim.height * displayScale;
    const gap = displayScale === 1 ? 0 : 12;
    const totalItemHeight = pageHeight + gap;

    const newPage = Math.floor((scrollTop + (pageHeight * 0.3)) / totalItemHeight) + 1;
    setCurrentPage(Math.min(Math.max(newPage, 1), totalPages));
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 md:pb-0 h-screen flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print flex-none">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <i className="fas fa-book-open text-brand-600 text-2xl"></i>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">Bible Plan Builder</h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={isExporting}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait w-48 justify-center"
            >
              {isExporting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-download"></i>}
              <span>{isExporting ? '處理中...' : '匯出 / 下載'}</span>
              {!isExporting && <i className={`fas fa-chevron-down text-xs transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`}></i>}
            </button>

            {/* Progress Label */}
            {isExporting && exportProgress && (
              <div className="absolute top-12 right-0 text-xs text-brand-600 bg-white px-2 py-1 rounded shadow border border-brand-100 whitespace-nowrap z-50">
                {exportProgress}
              </div>
            )}

            {isExportMenuOpen && !isExporting && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in-down">

                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-700 group"
                >
                  <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-file-pdf"></i>
                  </div>
                  <div>
                    <span className="block text-sm font-medium">下載 PDF 文件</span>
                    <span className="block text-xs text-slate-400">直接下載單一檔案，方便列印</span>
                  </div>
                </button>

                <div className="h-px bg-slate-100 my-1 mx-2"></div>

                <button
                  onClick={() => handleExport('jpeg')}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-700 group"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-images"></i>
                  </div>
                  <div>
                    <span className="block text-sm font-medium">下載 JPG (ZIP 壓縮包)</span>
                    <span className="block text-xs text-slate-400">每頁存為一張圖片，適合傳輸</span>
                  </div>
                </button>

                <button
                  onClick={() => handleExport('png')}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-700 group"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fas fa-file-archive"></i>
                  </div>
                  <div>
                    <span className="block text-sm font-medium">下載 PNG (ZIP 壓縮包)</span>
                    <span className="block text-xs text-slate-400">高品質無損圖片</span>
                  </div>
                </button>
              </div>
            )}

            {isExportMenuOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)}></div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden w-full max-w-7xl mx-auto md:p-4 grid grid-cols-1 md:grid-cols-12 gap-4 no-print relative">

        {/* Left Column: Controls (Scrollable) */}
        <div className={`md:col-span-5 lg:col-span-5 flex flex-col gap-4 overflow-hidden h-full ${showMobilePreview ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex p-1 bg-slate-200 rounded-xl flex-none">
            <button
              onClick={() => setTab('config')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'config' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              進度設定
            </button>
            <button
              onClick={() => setTab('style')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'style' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              風格設計
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar rounded-xl border border-slate-100 shadow-sm bg-white">
            {tab === 'config' ? (
              <ConfigPanel settings={planSettings} onChange={setPlanSettings} />
            ) : (
              <StylePanel style={styleSettings} onChange={setStyleSettings} />
            )}
          </div>
        </div>

        {/* Right Column: Preview (Zoomable) */}
        <div className={`md:col-span-7 lg:col-span-7 flex-col bg-slate-200 rounded-2xl border border-slate-300 overflow-hidden relative shadow-inner ${showMobilePreview ? 'flex' : 'hidden md:flex'}`}>

          {/* Toolbar */}
          <div className="flex justify-between items-center p-2 px-4 bg-white border-b border-slate-200 text-sm z-10 shadow-sm">
            <div className="text-slate-500 font-mono text-xs">
              {planSettings.paperSize} ({Math.round(paperDim.width)}x{Math.round(paperDim.height)}px)
            </div>
            <div className="flex items-center gap-3">
              <i className="fas fa-search-minus text-slate-400"></i>
              <input
                type="range"
                min="1"
                max="4"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-32 accent-brand-600 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
              />
              <i className="fas fa-search-plus text-slate-600"></i>
              <span className="w-8 text-right font-mono text-xs">{Math.round(zoom * 100)}%</span>
            </div>
          </div>

          {/* Scrollable Canvas Container */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-auto p-4 bg-slate-500/10 flex flex-col items-center relative"
          >
            <div className="sticky top-0 self-end mr-2 z-20 mb-[-30px]">
              <div className="bg-slate-800/80 text-white text-xs px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm font-mono border border-white/20">
                第 {currentPage} / {totalPages} 頁
              </div>
            </div>

            <div className="transition-transform duration-75 origin-top ease-out">
              <PreviewCanvas
                planSettings={planSettings}
                styleSettings={styleSettings}
                scale={displayScale}
                className="origin-top"
                onPageCountChange={setTotalPages}
              />
            </div>
            <div className="mt-8 mb-4 pointer-events-none">
              <div className="inline-block bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                {planSettings.timeFrame === TimeFrame.Year ? '內容較多時會自動分頁' : '預覽模式'}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Toggle Button (Floating) */}
        <button
          onClick={() => setShowMobilePreview(!showMobilePreview)}
          className="md:hidden absolute bottom-6 right-6 z-50 bg-brand-600 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 text-lg active:scale-95 transition-transform"
          aria-label={showMobilePreview ? "切換至設定" : "切換至預覽"}
        >
          {showMobilePreview ? (
            <>
              <i className="fas fa-sliders-h"></i>
              <span className="font-bold">設定</span>
            </>
          ) : (
            <>
              <i className="fas fa-eye"></i>
              <span className="font-bold">預覽</span>
            </>
          )}
        </button>

      </main>

      {/* Hidden container for printing and image generation */}
      {/* We use ref={printContainerRef} to capture this specific DOM structure for html2canvas */}
      <div
        ref={printContainerRef}
        className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full"
      >
        <div className="print:transform-none">
          {/* Scale 1 for actual print size */}
          <PreviewCanvas
            planSettings={planSettings}
            styleSettings={styleSettings}
            scale={1}
          />
        </div>
      </div>
    </div>
  );
};

export default App;