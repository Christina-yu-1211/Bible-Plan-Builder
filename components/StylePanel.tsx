import React from 'react';
import { StyleSettings, MarkerStyle } from '../types';

interface StylePanelProps {
  style: StyleSettings;
  onChange: (newStyle: StyleSettings) => void;
}

export const StylePanel: React.FC<StylePanelProps> = ({ style, onChange }) => {

  const handleChange = (field: keyof StyleSettings, value: any) => {
    onChange({ ...style, [field]: value });
  };

  // New helper to handle multiple changes at once to fix the race condition/batching issue
  const handleMultipleChanges = (changes: Partial<StyleSettings>) => {
    onChange({ ...style, ...changes });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          handleChange('backgroundImage', ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };



  const presetThemes = [
    { name: '簡約白 ⚪', bg: '#ffffff', text: '#1e293b' },
    { name: '護眼米 👁️', bg: '#fefce8', text: '#422006' },
    { name: '森林綠 🌲', bg: '#f0fdf4', text: '#14532d' },
    { name: '少女粉 🌸', bg: '#fff1f2', text: '#881337' },
  ];

  const fontOptions = [
    { name: '思源黑體 (預設)', value: "'Noto Sans TC', sans-serif" },
    { name: '思源宋體 (優雅)', value: "'Noto Serif TC', serif" },
    { name: '霞鶩文楷 (手寫)', value: "'LXGW WenKai TC', cursive" },
    { name: '圓體 (可愛)', value: "'Zen Maru Gothic', sans-serif" },
  ];

  return (
    <div className="space-y-6 p-6 bg-white rounded-xl shadow-sm border border-slate-100 h-full overflow-y-auto max-h-[calc(100vh-200px)] no-scrollbar pb-24">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <i className="fas fa-paint-brush text-brand-600"></i> 風格設計
      </h2>

      {/* Basic Text Info */}
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">主標題</label>
          <input
            type="text"
            maxLength={20}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            value={style.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="例如：2024 讀經計畫"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">副標題 (選填)</label>
          <input
            type="text"
            maxLength={30}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
            value={style.subtitle || ''}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            placeholder="預設顯示日期範圍，輸入文字可覆蓋"
          />
        </div>
      </div>

      {/* Global Colors */}
      <div className="border-t border-slate-100 pt-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">全域配色</label>
        <div className="flex gap-2 mb-3">
          {presetThemes.map((t) => (
            <button
              key={t.name}
              onClick={() => {
                // FIXED: Use single update to prevent overwriting
                handleMultipleChanges({
                  backgroundColor: t.bg,
                  themeColor: t.text,
                  titleColor: undefined,
                  contentColor: undefined
                });
              }}
              className="w-8 h-8 rounded-full border border-slate-200 shadow-sm transform hover:scale-110 transition-transform"
              style={{ backgroundColor: t.bg }}
              title={t.name}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-slate-500 block mb-1">背景底色</span>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded border border-slate-200">
              <input
                type="color"
                className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
                value={style.backgroundColor}
                onChange={(e) => handleChange('backgroundColor', e.target.value)}
              />
              <span className="text-xs text-slate-600 font-mono">{style.backgroundColor}</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">主要字色</span>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded border border-slate-200">
              <input
                type="color"
                className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
                value={style.themeColor}
                onChange={(e) => handleChange('themeColor', e.target.value)}
              />
              <span className="text-xs text-slate-600 font-mono">{style.themeColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Marker (Moved from ConfigPanel) */}
      <div className="border-t border-slate-100 pt-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">完成標記</label>
        <select
          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
          value={style.markerStyle}
          onChange={(e) => handleChange('markerStyle', e.target.value)}
        >
          <option value={MarkerStyle.Checkbox}>方框打勾 (☑)</option>
          <option value={MarkerStyle.Circle}>圓圈塗滿 (○)</option>
          <option value={MarkerStyle.Underline}>底線簽名 (__)</option>
          <option value={MarkerStyle.None}>無標記</option>
        </select>
      </div>

      {/* Advanced Typography Settings */}
      <div className="border-t border-slate-100 pt-4 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">細部文字設定</h3>

        {/* Font Family */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">字體選擇</label>
          <select
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-sans"
            value={style.fontFamily}
            onChange={(e) => handleChange('fontFamily', e.target.value)}
          >
            {fontOptions.map(f => (
              <option key={f.value} value={f.value}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Title Settings */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">標題樣式</span>
            <input
              type="color"
              className="w-5 h-5 p-0 border-0 rounded cursor-pointer"
              value={style.titleColor || style.themeColor}
              onChange={(e) => handleChange('titleColor', e.target.value)}
              title="標題顏色"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-8">大小</span>
            <input
              type="range" min="0.5" max="2.0" step="0.1"
              className="flex-1 accent-brand-600 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
              value={style.titleScale}
              onChange={(e) => handleChange('titleScale', parseFloat(e.target.value))}
            />
            <span className="text-xs text-slate-500 w-8 text-right">{style.titleScale}x</span>
          </div>
        </div>

        {/* Content Settings */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">內文樣式</span>
            <input
              type="color"
              className="w-5 h-5 p-0 border-0 rounded cursor-pointer"
              value={style.contentColor || style.themeColor}
              onChange={(e) => handleChange('contentColor', e.target.value)}
              title="內文顏色"
            />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-8">大小</span>
              <input
                type="range" min="0.8" max="2.0" step="0.1"
                className="flex-1 accent-brand-600 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                value={style.contentScale}
                onChange={(e) => handleChange('contentScale', parseFloat(e.target.value))}
              />
              <span className="text-xs text-slate-500 w-8 text-right">{style.contentScale}x</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-8">行距</span>
              <input
                type="range" min="0.5" max="3.0" step="0.1"
                className="flex-1 accent-brand-600 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                value={style.lineHeight || 1.2}
                onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value))}
              />
              <span className="text-xs text-slate-500 w-8 text-right">{style.lineHeight || 1.2}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background Image */}
      <div className="border-t border-slate-100 pt-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">背景圖片</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="block w-full text-sm text-slate-500 mb-4
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-brand-50 file:text-brand-700
                hover:file:bg-brand-100
              "
        />

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg border border-purple-100 hidden">
          {/* AI Feature Removed */}
        </div>

        {style.backgroundImage && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>背景淡化 (白膜)</span>
              <span>{Math.round(style.overlayOpacity * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="0.95" step="0.05"
              className="w-full accent-brand-600"
              value={style.overlayOpacity}
              onChange={(e) => handleChange('overlayOpacity', parseFloat(e.target.value))}
            />
            <button
              onClick={() => handleChange('backgroundImage', null)}
              className="text-xs text-red-500 underline mt-1"
            >
              移除背景
            </button>
          </div>
        )}
      </div>

    </div>
  );
};