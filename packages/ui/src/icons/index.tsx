import type { LucideProps } from "lucide-react";
import {
  Globe,
  AppWindow,
  Terminal,
  BookOpen,
  MessageCircle,
  BarChart3,
  Settings,
  PenTool,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RotateCw,
  X,
  Download,
  Search,
  Plus,
  Star,
  Archive,
  Trash2,
  SlidersHorizontal,
  ArrowUpDown,
  Share,
  Copy,
  FileText,
  Highlighter,
  Code,
  Play,
  Image,
  Lock,
  Loader,
  Check,
  AlertCircle,
  AlertTriangle,
  Shield,
  GitBranch,
  DollarSign,
  Activity,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  FolderOpen,
  Filter,
  Hash,
  Clock,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  Inbox,
  Layers,
  Wifi,
  WifiOff,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import type { ComponentType } from "react";

const ICON_MAP = {
  // Tab types
  web: Globe,
  app: AppWindow,
  terminal: Terminal,
  knowledge: BookOpen,
  chat: MessageCircle,
  dashboard: BarChart3,
  settings: Settings,
  canvas: PenTool,

  // Navigation
  back: ChevronLeft,
  forward: ChevronRight,
  up: ChevronUp,
  down: ChevronDown,
  reload: RotateCw,
  stop: X,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,

  // Actions
  close: X,
  capture: Download,
  search: Search,
  add: Plus,
  favorite: Star,
  archive: Archive,
  delete: Trash2,
  filter: SlidersHorizontal,
  sort: ArrowUpDown,
  export: Share,
  copy: Copy,
  send: Send,
  more: MoreHorizontal,
  externalLink: ExternalLink,
  refresh: RefreshCw,
  eye: Eye,
  eyeOff: EyeOff,

  // Content items
  article: FileText,
  highlight: Highlighter,
  code: Code,
  pdf: FileText,
  youtube: Play,
  image: Image,
  play: Play,

  // Status
  lock: Lock,
  loading: Loader,
  success: Check,
  check: Check,
  error: AlertCircle,
  warning: AlertTriangle,

  // Engine modules
  guard: Shield,
  forge: GitBranch,
  cost: DollarSign,
  pulse: Activity,
  keys: Keyboard,

  // Sidebar
  collapse: PanelLeftClose,
  expand: PanelLeftOpen,

  // Media
  mic: Mic,
  micOff: MicOff,
  camera: Camera,
  cameraOff: CameraOff,
  phone: Phone,
  phoneOff: PhoneOff,
  volume: Volume2,
  volumeOff: VolumeX,
  minimize: Minimize2,
  maximize: Maximize2,

  // Organization
  folder: FolderOpen,
  filterAlt: Filter,
  tag: Hash,
  clock: Clock,
  inbox: Inbox,
  layers: Layers,

  // Connection
  wifi: Wifi,
  wifiOff: WifiOff,

  // Theme
  moon: Moon,
  sun: Sun,
  monitor: Monitor,
} as const;

export type IconName = keyof typeof ICON_MAP;

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

export function Icon({ name, size = 16, ...rest }: IconProps): React.ReactElement {
  const Component: ComponentType<LucideProps> = ICON_MAP[name];
  return <Component size={size} strokeWidth={1.5} {...rest} />;
}

export { ICON_MAP };
