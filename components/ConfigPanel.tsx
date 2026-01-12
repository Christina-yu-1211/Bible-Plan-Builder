import React from 'react';
import { PlanSettings, PaperSize, TimeFrame, PlanMode, OrderType, ScopeType } from '../types';
import { BIBLE_BOOKS } from '../constants';

interface ConfigPanelProps {
  settings: PlanSettings;
  onChange: (newSettings: PlanSettings) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ settings, onChange }) => {
  
  const handleChange = (field: keyof PlanSettings, value: any) => {
    onChange({ ...settings, [field]: value });
  };

  const handleEndDateChange = (date: string) => {
    // When user manually selects end date, switch mode to DateRange automatically for UX
    onChange({
      ...settings,
      endDate: date,
      mode: PlanMode.DateRange
    });
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <i className="fas fa-sliders-h text-brand-600"></i> 進度設定
      </h2>

      <div className="grid grid-cols-1 gap-6">
        
        {/* 1. Paper Size */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">1. 紙張規格</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            value={settings.paperSize}
            onChange={(e) => handleChange('paperSize', e.target.value)}
          >
            <option value={PaperSize.P4x6}>4x6 明信片 (10x14.8cm，適用7-11 ibon)</option>
            <option value={PaperSize.A5}>A5 (14.8x21cm)</option>
            <option value={PaperSize.A4}>A4 (21x29.7cm)</option>
          </select>
        </div>

        {/* 2. Reading Scope */}
        <div className="border-t border-slate-100 pt-4">
           <label className="block text-sm font-medium text-slate-700 mb-2">2. 閱讀範圍</label>
           <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="scopeType"
                  checked={settings.scopeType === ScopeType.All}
                  onChange={() => handleChange('scopeType', ScopeType.All)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span>整本聖經</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="scopeType"
                  checked={settings.scopeType === ScopeType.Range}
                  onChange={() => handleChange('scopeType', ScopeType.Range)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span>自訂範圍</span>
              </label>
           </div>

           {settings.scopeType === ScopeType.Range && (
             <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <select 
                  className="flex-1 p-2 border border-slate-300 rounded outline-none"
                  value={settings.rangeStartBook}
                  onChange={(e) => handleChange('rangeStartBook', parseInt(e.target.value))}
                >
                  {BIBLE_BOOKS.map((b, idx) => (
                    <option key={`start-${idx}`} value={idx}>{b.name}</option>
                  ))}
                </select>
                <span className="text-slate-400">至</span>
                <select 
                  className="flex-1 p-2 border border-slate-300 rounded outline-none"
                  value={settings.rangeEndBook}
                  onChange={(e) => handleChange('rangeEndBook', parseInt(e.target.value))}
                >
                  {BIBLE_BOOKS.map((b, idx) => (
                    <option key={`end-${idx}`} value={idx}>{b.name}</option>
                  ))}
                </select>
             </div>
           )}
        </div>

        {/* 3. Reading Order (Only for Scope = All) */}
        {settings.scopeType === ScopeType.All && (
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">3. 閱讀順序</label>
            <select 
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              value={settings.orderType}
              onChange={(e) => handleChange('orderType', e.target.value)}
            >
              <option value={OrderType.OT_Start}>標準順序 (創世記 → 啟示錄)</option>
              <option value={OrderType.NT_Start}>新約優先 (馬太福音 → 舊約)</option>
              <option value={OrderType.Custom}>指定書卷開始</option>
            </select>
          
            {settings.orderType === OrderType.Custom && (
              <div className="mt-2">
                <label className="block text-xs text-slate-500 mb-1">選擇開始書卷 (讀完後將循環回創世記)</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  value={settings.startBookIndex}
                  onChange={(e) => handleChange('startBookIndex', parseInt(e.target.value))}
                >
                  {BIBLE_BOOKS.map((b, idx) => (
                    <option key={idx} value={idx}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* 4. Date Settings */}
        <div className="border-t border-slate-100 pt-4">
           <label className="block text-sm font-medium text-slate-700 mb-2">4. 起迄日期</label>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <span className="text-xs text-slate-500 block mb-1">開始日期</span>
               <input 
                type="date"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                value={settings.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
             </div>
             <div>
               <span className="text-xs text-slate-500 block mb-1">結束日期 (選填)</span>
               <input 
                type="date"
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none ${settings.mode === PlanMode.DateRange ? 'border-brand-500 bg-white' : 'border-slate-300 bg-slate-50'}`}
                value={settings.endDate || ''}
                min={settings.startDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
              />
             </div>
           </div>
           {settings.mode !== PlanMode.DateRange && (
             <p className="text-xs text-slate-500 mt-2">
               * 選擇結束日期將自動切換為「指定日期」模式
             </p>
           )}
        </div>

        {/* 5. Planning Mode */}
        <div className="border-t border-slate-100 pt-4">
           <label className="block text-sm font-medium text-slate-700 mb-2">5. 規劃方式</label>
           <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col gap-3">
              
              {/* Option A */}
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="mode"
                      checked={settings.mode === PlanMode.ChaptersPerDay}
                      onChange={() => handleChange('mode', PlanMode.ChaptersPerDay)}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <span>每天讀</span>
                </div>
                <div className="flex items-center gap-2">
                     <input 
                        type="number" min="1" max="50"
                        className="w-16 p-1 border rounded text-center text-sm"
                        value={settings.chaptersPerDay}
                        onChange={(e) => handleChange('chaptersPerDay', parseInt(e.target.value) || 1)}
                        disabled={settings.mode !== PlanMode.ChaptersPerDay}
                     />
                     <span className="text-sm text-slate-600">章</span>
                </div>
              </label>
              
              {/* Option B */}
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="mode"
                      checked={settings.mode === PlanMode.Duration}
                      onChange={() => handleChange('mode', PlanMode.Duration)}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <span>預計</span>
                </div>
                <div className="flex items-center gap-2">
                     <input 
                        type="number" min="1" max="60"
                        className="w-16 p-1 border rounded text-center text-sm"
                        value={settings.durationMonths}
                        onChange={(e) => handleChange('durationMonths', parseInt(e.target.value) || 1)}
                        disabled={settings.mode !== PlanMode.Duration}
                     />
                     <span className="text-sm text-slate-600">個月讀完</span>
                </div>
              </label>

              {/* Option C */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="mode"
                  checked={settings.mode === PlanMode.DateRange}
                  onChange={() => handleChange('mode', PlanMode.DateRange)}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span>依據上方結束日期自動計算</span>
              </label>
           </div>
        </div>

      </div>
    </div>
  );
};