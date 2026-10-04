import {
  BookOpen,
  ClipboardCheck,
  Coffee,
  Gamepad2,
  GraduationCap,
  Mic,
  Presentation,
  Server,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const FACILITY_ICONS: Record<string, LucideIcon> = {
  coffee: Coffee,
  lounge: Gamepad2,
  library: BookOpen,
  server: Server,
  sound: Mic,
  testlab: ClipboardCheck,
  workshop: Wrench,
  academy: GraduationCap,
  showroom: Presentation,
};
