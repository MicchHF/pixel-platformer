import React, { useState } from 'react';
import { 
  X, Code2, Copy, Check, ExternalLink, MapPin, Terminal, 
  Settings2, Sliders, Layers, Sparkles, Send 
} from 'lucide-react';
import { ThemeName } from '../types/game';

interface EmbedDrawerProps {
  currentTheme: ThemeName;
  currentLevelId: number;
  onClose: () => void;
}

export const EmbedDrawer: React.FC<EmbedDrawerProps> = ({
  currentTheme,
  currentLevelId,
  onClose,
}) => {
  const [embedTheme, setEmbedTheme] = useState<ThemeName>(currentTheme);
  const [embedLevel, setEmbedLevel] = useState<number>(currentLevelId);
  const [isCompact, setIsCompact] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [touchMode, setTouchMode] = useState<string>('auto');
  const [embedWidth, setEmbedWidth] = useState<number>(560);
  const [embedHeight, setEmbedHeight] = useState<number>(380);

  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'iframe' | 'map_example' | 'postmessage'>('iframe');

  // Base URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = `${baseUrl}/?embed=true&compact=${isCompact}&level=${embedLevel}&theme=${embedTheme}&muted=${isMuted}&touch=${touchMode}`;
  const iframeCode = `<iframe
  src="${embedUrl}"
  width="${embedWidth}"
  height="${embedHeight}"
  style="border: 0; border-radius: 12px; overflow: hidden;"
  allow="autoplay"
  loading="lazy"
></iframe>`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(label);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // Map Integration Example (Leaflet / Mapbox / OpenLayers)
  const mapboxExampleCode = `// Пример встраивания платформера в метку на карте (Mapbox GL JS / Leaflet)
const markerPopup = new mapboxgl.Popup({ maxWidth: '580px' })
  .setLngLat([37.6173, 55.7558]) // Координаты тайника/локации
  .setHTML(\`
    <div style="background: #090a0f; padding: 6px; border-radius: 12px; font-family: sans-serif;">
      <h4 style="color: #00f0ff; margin: 4px 8px; font-size: 13px;">🏆 Мини-игра локации: Испытание #\${${embedLevel}}</h4>
      <iframe
        id="pixelGameIframe"
        src="${embedUrl}"
        width="540"
        height="350"
        style="border: 0; border-radius: 8px; display: block;"
        allow="autoplay"
      ></iframe>
    </div>
  \`);

// Слушаем события завершения уровня от платформера в родительском приложении
window.addEventListener('message', (event) => {
  if (event.data?.source === 'HARDCORE_PIXEL_PLATFORMER') {
    if (event.data.type === 'LEVEL_COMPLETED') {
      console.log('Игрок прошел уровень на карте!', event.data);
      // Например: начислить очки пользователю или открыть следующую точку на карте!
      alert(\`Уровень пройден за \${event.data.time.toFixed(2)} сек! Смертей: \${event.data.deaths}\`);
    }
  }
});`;

  const reactMapCardCode = `// React компонент всплывающей карточки на карте
import React, { useEffect } from 'react';

export function MapGameCard({ levelId = 1, onWin }) {
  useEffect(() => {
    const handleGameMessage = (event) => {
      if (event.data?.source === 'HARDCORE_PIXEL_PLATFORMER') {
        if (event.data.type === 'LEVEL_COMPLETED') {
          onWin?.(event.data);
        }
      }
    };
    window.addEventListener('message', handleGameMessage);
    return () => window.removeEventListener('message', handleGameMessage);
  }, [onWin]);

  return (
    <div className="rounded-xl overflow-hidden shadow-2xl border border-zinc-700 bg-zinc-950 p-1">
      <iframe
        src="${baseUrl}/?embed=true&compact=true&level=\${levelId}&theme=neon"
        className="w-full h-80 rounded-lg border-0"
        title="Map Mini Game"
      />
    </div>
  );
}`;

  return (
    <div 
      id="embed-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm font-mono select-none"
      onClick={onClose}
    >
      <div 
        id="embed-modal-window"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wider">
                Встраивание в Веб-Приложение / Карты
              </h2>
              <p className="text-[11px] text-zinc-400 font-sans">
                Iframe интеграция, postMessage события и параметры URL для карт (Mapbox, Leaflet, React)
              </p>
            </div>
          </div>

          <button
            id="close-embed-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-zinc-800 bg-zinc-950/80 px-6 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('iframe')}
            className={`px-4 py-2 font-bold rounded-t-lg transition border-t border-x cursor-pointer ${
              activeTab === 'iframe'
                ? 'bg-zinc-900 border-zinc-700 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            1. Iframe Генератор
          </button>
          <button
            onClick={() => setActiveTab('map_example')}
            className={`px-4 py-2 font-bold rounded-t-lg transition border-t border-x cursor-pointer ${
              activeTab === 'map_example'
                ? 'bg-zinc-900 border-zinc-700 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            2. Код для Карты (Mapbox / Leaflet / React)
          </button>
          <button
            onClick={() => setActiveTab('postmessage')}
            className={`px-4 py-2 font-bold rounded-t-lg transition border-t border-x cursor-pointer ${
              activeTab === 'postmessage'
                ? 'bg-zinc-900 border-zinc-700 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            3. postMessage API (События & Управление)
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          {activeTab === 'iframe' && (
            <div className="space-y-6">
              {/* Configurator Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
                {/* Level */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1.5 uppercase">
                    Стартовый Уровень
                  </label>
                  <select
                    value={embedLevel}
                    onChange={(e) => setEmbedLevel(parseInt(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((lvl) => (
                      <option key={lvl} value={lvl}>Уровень {lvl}</option>
                    ))}
                  </select>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1.5 uppercase">
                    Цветовая Тема
                  </label>
                  <select
                    value={embedTheme}
                    onChange={(e) => setEmbedTheme(e.target.value as ThemeName)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="neon">Cyber Neon</option>
                    <option value="gameboy">Classic 1989 (GameBoy)</option>
                    <option value="noir">Blood Noir</option>
                    <option value="pico">PICO-8 Fantasy</option>
                    <option value="cyberpunk">Synthwave Matrix</option>
                    <option value="monochrome">Pure Minimalist</option>
                  </select>
                </div>

                {/* Touch controls */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1.5 uppercase">
                    Сенсорные кнопки
                  </label>
                  <select
                    value={touchMode}
                    onChange={(e) => setTouchMode(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="auto">Авто (для мобильных)</option>
                    <option value="always">Всегда включены</option>
                    <option value="hidden">Скрыты (только клавиатура)</option>
                  </select>
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-6 col-span-full pt-2 border-t border-zinc-800">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={isCompact}
                      onChange={(e) => setIsCompact(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500 rounded"
                    />
                    <span>Компактный режим (Compact HUD для карт)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={isMuted}
                      onChange={(e) => setIsMuted(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500 rounded"
                    />
                    <span>Без звука по умолчанию (Muted)</span>
                  </label>
                </div>
              </div>

              {/* Ready Iframe Snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-300">Готовый HTML код для вставки:</span>
                  <button
                    onClick={() => copyToClipboard(iframeCode, 'iframe')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-semibold transition cursor-pointer"
                  >
                    {copiedSnippet === 'iframe' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'iframe' ? 'Скопировано!' : 'Копировать Iframe'}</span>
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-cyan-300 overflow-x-auto select-text font-mono text-[11px] leading-relaxed">
                  {iframeCode}
                </pre>
              </div>

              {/* Direct Embed URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-300">Прямая ссылка для встраивания:</span>
                  <button
                    onClick={() => copyToClipboard(embedUrl, 'url')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-semibold transition cursor-pointer"
                  >
                    {copiedSnippet === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'url' ? 'Скопировано!' : 'Копировать URL'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 truncate select-text">
                  {embedUrl}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'map_example' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    <span className="font-bold text-zinc-200">Mapbox GL / Leaflet Popup пример:</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(mapboxExampleCode, 'mapbox')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 cursor-pointer"
                  >
                    {copiedSnippet === 'mapbox' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Копировать код</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-emerald-400 overflow-x-auto select-text text-[11px] leading-relaxed font-mono">
                  {mapboxExampleCode}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">React компонент карточки карты:</span>
                  <button
                    onClick={() => copyToClipboard(reactMapCardCode, 'react')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 cursor-pointer"
                  >
                    {copiedSnippet === 'react' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Копировать код</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-cyan-300 overflow-x-auto select-text text-[11px] leading-relaxed font-mono">
                  {reactMapCardCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'postmessage' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-zinc-200 mb-2">Отправляемые события (Game → Web App):</h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-cyan-400 font-bold">LEVEL_COMPLETED</span>
                    <p className="text-zinc-400 mt-1">
                      Срабатывает при входе в портал выхода. Передает: <code className="text-zinc-200">{`{ source: 'HARDCORE_PIXEL_PLATFORMER', type: 'LEVEL_COMPLETED', levelId: 3, time: 4.82, deaths: 5, parTime: 4.8 }`}</code>
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-rose-400 font-bold">PLAYER_DIED</span>
                    <p className="text-zinc-400 mt-1">
                      Срабатывает при каждой гибели от шипов, пил или лазеров. Передает: <code className="text-zinc-200">{`{ source: 'HARDCORE_PIXEL_PLATFORMER', type: 'PLAYER_DIED', levelId: 3, totalDeaths: 6 }`}</code>
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-emerald-400 font-bold">ALL_LEVELS_CLEARED</span>
                    <p className="text-zinc-400 mt-1">
                      Срабатывает при завершении всех 15 уровней. Передает общее время спидрана и суммарные смерти.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-zinc-200 mb-2">Команды управления (Web App → Game):</h3>
                <p className="text-zinc-400 mb-2">
                  Отправляйте сообщения в iframe через <code className="text-cyan-300">iframeEl.contentWindow.postMessage(data, '*')</code>:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                    <code className="text-amber-300">{`{ type: 'LOAD_LEVEL', levelId: 5 }`}</code>
                    <div className="text-zinc-500 mt-0.5">Переключить на уровень 5</div>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                    <code className="text-amber-300">{`{ type: 'RESTART' }`}</code>
                    <div className="text-zinc-500 mt-0.5">Перезапустить текущий уровень</div>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                    <code className="text-amber-300">{`{ type: 'SET_THEME', theme: 'noir' }`}</code>
                    <div className="text-zinc-500 mt-0.5">Сменить палитру</div>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                    <code className="text-amber-300">{`{ type: 'PAUSE' }`}</code> / <code className="text-amber-300">{`{ type: 'RESUME' }`}</code>
                    <div className="text-zinc-500 mt-0.5">Пауза / Продолжить игру</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-800 bg-zinc-950">
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
