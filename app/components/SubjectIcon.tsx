import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe,
  Landmark,
  Languages,
  Leaf,
  Music,
  Palette,
  Scale,
  Scroll,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";
import type { SubjectIcon as SubjectIconName } from "~/shared/subject-theme";

/** Explicit map keeps the bundle to the icons subjects can actually use. */
const ICONS: Record<SubjectIconName, ComponentType<LucideProps>> = {
  "book-open": BookOpen,
  scroll: Scroll,
  landmark: Landmark,
  "flask-conical": FlaskConical,
  calculator: Calculator,
  globe: Globe,
  languages: Languages,
  music: Music,
  palette: Palette,
  atom: Atom,
  leaf: Leaf,
  scale: Scale,
};

export function SubjectIcon({ name, ...props }: { name: SubjectIconName } & LucideProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" {...props} />;
}
