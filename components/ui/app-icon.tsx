import {
  Alert02Icon,
  Analytics01Icon,
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Award01Icon,
  BookOpen01Icon,
  Briefcase01Icon,
  ChartBarIncreasingIcon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  Edit02Icon,
  File02Icon,
  Globe02Icon,
  HelpCircleIcon,
  Key01Icon,
  LanguageCircleIcon,
  Layout01Icon,
  Loading03Icon,
  MapPinIcon,
  PrinterIcon,
  Refresh01Icon,
  Shield01Icon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/huge-icon";

type AppIconProps = { className?: string; size?: number | string; strokeWidth?: number };

function icon(iconData: Parameters<typeof HugeIcon>[0]["icon"]) {
  return function AppIcon({ className, size = 18, strokeWidth = 1.8 }: AppIconProps) {
    return <HugeIcon icon={iconData} size={size} strokeWidth={strokeWidth} className={className} />;
  };
}

export const AlertCircle = icon(Alert02Icon);
export const AlertTriangle = icon(Alert02Icon);
export const ArrowLeft = icon(ArrowLeft01Icon);
export const ArrowRight = icon(ArrowRight01Icon);
export const Award = icon(Award01Icon);
export const BarChart3 = icon(Analytics01Icon);
export const BookOpen = icon(BookOpen01Icon);
export const Briefcase = icon(Briefcase01Icon);
export const Check = icon(CheckmarkCircle02Icon);
export const CheckCircle2 = icon(CheckmarkCircle02Icon);
export const ChevronLeft = icon(ArrowLeft01Icon);
export const ChevronRight = icon(ArrowRight01Icon);
export const Copy = icon(Copy01Icon);
export const Download = icon(Download01Icon);
export const FileText = icon(File02Icon);
export const Globe = icon(Globe02Icon);
export const HelpCircle = icon(HelpCircleIcon);
export const Key = icon(Key01Icon);
export const Languages = icon(LanguageCircleIcon);
export const Layout = icon(Layout01Icon);
export const Loader2 = icon(Loading03Icon);
export const MapPin = icon(MapPinIcon);
export const PenTool = icon(Edit02Icon);
export const Plus = icon(Add01Icon);
export const Printer = icon(PrinterIcon);
export const RefreshCw = icon(Refresh01Icon);
export const Save = icon(CheckmarkCircle02Icon);
export const ShieldAlert = icon(Shield01Icon);
export const ShieldCheck = icon(ShieldCheckIcon);
export const Sparkles = icon(SparklesIcon);
export const Trash2 = icon(Delete02Icon);
export const TrendingUp = icon(ChartBarIncreasingIcon);
export const User = icon(UserIcon);
