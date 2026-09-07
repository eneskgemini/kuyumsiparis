import { FileText, RefreshCcw, CheckSquare, CheckCircle } from 'lucide-react';

export const DEFAULT_LOGO_URL = "https://i.hizliresim.com/6pdu20m.png"; 
export const DEFAULT_FRAME_URL = "https://i.hizliresim.com/pq4m3mg.png";
export const CATEGORIES = ["Anasayfa", "Yüzük", "Kolye", "Küpe", "Bileklik", "Set", "Haç"];
export const SUBCATEGORIES = {
  "Yüzük": ["AS-B", "SMG", "SA-Y", "SB-M", "SB-Y", "SH-R", "SH-Y", "SK-Y", "SM-I", "SM-T", "SM-Y", "SR-G", "SS-H", "SS-Y", "ST-I", "ST-O"],
  "Kolye": ["SA-K", "SH-H", "SK-A", "SK-B", "SK-E"],
  "Küpe": ["SH-K", "SK-M", "SM-K", "SR-E"],
  "Bileklik": ["AL-X", "SP-B", "SK-C"],
  "Set": ["SB-S", "SH-E", "SS-A", "SV-K"],
  "Haç": ["M-HC", "S-HC"]
};
export const KARAT_OPTIONS = ["8K", "9K", "10K", "14K", "18K", "21K", "22K"];
export const COLOR_OPTIONS = ["Yeşil", "Beyaz", "Rose"];
export const ORDER_STAGES = {
    new: { label: 'Yeni Sipariş', color: 'bg-gold-100 text-gold-800 dark:bg-gold-950/30 dark:text-gold-400', border: 'border-gold-200 dark:border-gold-900/40', icon: FileText },
    preparing: { label: 'Üretimde', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/40', icon: RefreshCcw },
    ready: { label: 'Hazır', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-900/40', icon: CheckSquare },
    delivered: { label: 'Teslim Edildi', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/40', icon: CheckCircle }
};
export const appId = "sahra-kuyum-app";