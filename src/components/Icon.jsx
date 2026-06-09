// Iconos curados de lucide-react (solo los que usamos → bundle ligero).
// Se referencian por nombre desde los datos. Si falta uno, cae en `Circle`.
import {
  HeartPulse, BookOpen, Wallet, Target, Sparkles, Droplet, Droplets, GraduationCap,
  Footprints, Moon, PiggyBank, CalendarCheck, Dumbbell, Salad, CupSoda, BookMarked,
  BookCheck, Languages, Receipt, HandCoins, Calculator, CircleCheck, ListChecks,
  Sunrise, Timer, Smartphone, Palette, Users, Wind, Compass, TrendingUp, Crown,
  ShieldCheck, Library, Brain, Banknote, Flame, Repeat, Map, Waves, Trophy, Coins,
  Mountain, Watch, Scale, Home, LayoutGrid, GitBranch, Award, Swords, DoorOpen,
  BarChart3, User, Plus, Minus, X, Check, ChevronRight, ChevronLeft, Zap, Settings,
  RotateCcw, Lock, Star, Trash2, Pencil, ArrowRight, Info, Calendar, Clock, Circle,
  Hourglass, Medal, Gem, PartyPopper, Sword, Shield, Heart, Quote,
} from 'lucide-react'

const MAP = {
  HeartPulse, BookOpen, Wallet, Target, Sparkles, Droplet, Droplets, GraduationCap,
  Footprints, Moon, PiggyBank, CalendarCheck, Dumbbell, Salad, CupSoda, BookMarked,
  BookCheck, Languages, Receipt, HandCoins, Calculator, CircleCheck, ListChecks,
  Sunrise, Timer, Smartphone, Palette, Users, Wind, Compass, TrendingUp, Crown,
  ShieldCheck, Library, Brain, Banknote, Flame, Repeat, Map, Waves, Trophy, Coins,
  Mountain, Watch, Scale, Home, LayoutGrid, GitBranch, Award, Swords, DoorOpen,
  BarChart3, User, Plus, Minus, X, Check, ChevronRight, ChevronLeft, Zap, Settings,
  RotateCcw, Lock, Star, Trash2, Pencil, ArrowRight, Info, Calendar, Clock, Circle,
  Hourglass, Medal, Gem, PartyPopper, Sword, Shield, Heart, Quote,
}

export default function Icon({ name, size = 20, className = '', strokeWidth = 2, style }) {
  const Cmp = MAP[name] || Circle
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} style={style} />
}
