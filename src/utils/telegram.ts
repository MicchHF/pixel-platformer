/**
 * Telegram WebApp Integration & Haptic Feedback Utilities
 */

export interface TelegramUserData {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
  isTelegram: boolean;
}

interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
    };
    start_param?: string;
  };
  version?: string;
  platform?: string;
  colorScheme?: 'light' | 'dark';
  themeParams?: Record<string, string>;
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  headerColor?: string;
  backgroundColor?: string;
  BackButton?: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
  shareToStory?: (mediaUrl: string, params?: unknown) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function isTelegramWebApp(): boolean {
  const tg = getTelegramWebApp();
  return Boolean(tg && tg.initData !== undefined);
}

export function initTelegram(): TelegramUserData {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#09090b');
      tg.setBackgroundColor('#09090b');
      if (typeof tg.enableClosingConfirmation === 'function') {
        tg.enableClosingConfirmation();
      }
    } catch (e) {
      console.warn('Telegram WebApp initialization error:', e);
    }

    const user = tg.initDataUnsafe?.user;
    if (user) {
      return {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        languageCode: user.language_code,
        photoUrl: user.photo_url,
        isTelegram: true,
      };
    }
  }

  // Fallback for non-Telegram browser
  let storedName = '';
  if (typeof window !== 'undefined') {
    try {
      storedName = localStorage.getItem('pixel_platformer_player_name') || '';
    } catch {}
  }

  return {
    firstName: storedName || 'Бегущий',
    isTelegram: false,
  };
}

/**
 * Haptic Feedback Triggers
 */
export const haptics = {
  light: () => {
    try {
      getTelegramWebApp()?.HapticFeedback?.impactOccurred('light');
    } catch {}
  },
  medium: () => {
    try {
      getTelegramWebApp()?.HapticFeedback?.impactOccurred('medium');
    } catch {}
  },
  heavy: () => {
    try {
      getTelegramWebApp()?.HapticFeedback?.impactOccurred('heavy');
    } catch {}
  },
  success: () => {
    try {
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred('success');
    } catch {}
  },
  error: () => {
    try {
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred('error');
    } catch {}
  },
  warning: () => {
    try {
      getTelegramWebApp()?.HapticFeedback?.notificationOccurred('warning');
    } catch {}
  },
  selection: () => {
    try {
      getTelegramWebApp()?.HapticFeedback?.selectionChanged();
    } catch {}
  },
};

/**
 * Share score or invite challenge to Telegram friends
 */
export function shareScoreToTelegram(options: {
  levelName: string;
  levelId: number;
  timeStr: string;
  deaths: number;
  botUsername?: string;
  customText?: string;
}): void {
  const currentUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
  const challengeUrl = `${currentUrl}?level=${options.levelId}&challengeTime=${options.timeStr}`;
  
  const text = options.customText || 
    `🎮 Я прошел «${options.levelName}» за ${options.timeStr} (смертей: ${options.deaths}) в Pixel Runner!\nСможешь побить мой рекорд? 🔥`;

  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(challengeUrl)}&text=${encodeURIComponent(text)}`;

  const tg = getTelegramWebApp();
  if (tg && typeof tg.openTelegramLink === 'function') {
    tg.openTelegramLink(shareUrl);
  } else if (typeof window !== 'undefined') {
    window.open(shareUrl, '_blank');
  }
}

/**
 * Copy text to clipboard safely
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  return false;
}
