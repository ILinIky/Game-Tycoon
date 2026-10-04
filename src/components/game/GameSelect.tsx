import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useStudioMotion } from "./GameMotion";

export interface GameSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}
export default function GameSelect({
  value,
  options,
  onChange,
  label,
  compact = false,
  disabled = false,
}: {
  value: string;
  options: GameSelectOption[];
  onChange: (value: string) => void;
  label: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const animated = useStudioMotion();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 280,
  });
  const chosen = options.find((option) => option.value === value);
  const enabled = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);
  const reveal = (index: number) => {
    setActive(index);
    requestAnimationFrame(() =>
      menu.current
        ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
        ?.scrollIntoView({ block: "nearest" }),
    );
  };
  const show = () => {
    const selected = options.findIndex(
      (option) => option.value === value && !option.disabled,
    );
    setActive(selected >= 0 ? selected : enabled[0]);
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const height = Math.min(
        280,
        options.reduce(
          (sum, option) => sum + (option.description ? 48 : 36),
          14,
        ),
      );
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upward = below < Math.min(height, 150) && above > below;
      const maxHeight = Math.max(48, Math.min(height, upward ? above : below));
      const width = Math.min(Math.max(rect.width, 160), window.innerWidth - 16);
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: upward ? Math.max(8, rect.top - maxHeight - 5) : rect.bottom + 5,
        width,
        maxHeight,
      });
    };
    place();
    window.addEventListener("resize", place);
    // Capture scrolling of the surrounding modal, without reacting to the menu itself.
    const scroll = (event: Event) => {
      if (event.target !== menu.current) place();
    };
    window.addEventListener("scroll", scroll, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open, options.length]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      menu.current
        ?.querySelector<HTMLElement>('[aria-selected="true"]')
        ?.scrollIntoView({ block: "nearest" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !menu.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`game-select ${compact ? "compact" : ""}`}
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled || !enabled.length}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            setOpen(false);
            return;
          }
          if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            return;
          }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            if (!open) {
              show();
              return;
            }
            const current = enabled.indexOf(active);
            reveal(
              event.key === "Home"
                ? enabled[0]
                : event.key === "End"
                  ? enabled.at(-1)!
                  : enabled[
                      (current +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        enabled.length) %
                        enabled.length
                    ],
            );
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            if (open) choose(active);
            else show();
          } else if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.preventDefault();
            event.stopPropagation();
            const now = Date.now();
            search.current.text =
              (now - search.current.time < 700 ? search.current.text : "") +
              event.key.toLocaleLowerCase("de");
            search.current.time = now;
            const index = options.findIndex(
              (option) =>
                !option.disabled &&
                option.label
                  .toLocaleLowerCase("de")
                  .startsWith(search.current.text),
            );
            if (!open) show();
            if (index >= 0) reveal(index);
          }
        }}
      >
        <span>{chosen?.label ?? "Bitte wählen"}</span>
        <ChevronDown
          size={compact ? 12 : 15}
          className={open ? "turned" : ""}
        />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menu}
              id={id}
              role="listbox"
              aria-label={label}
              className="game-select-menu"
              style={position}
              initial={animated ? { opacity: 0, y: -4 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: animated ? 0.14 : 0 }}
              onPointerDown={(event) => event.preventDefault()}
            >
              {options.map((option, index) => (
                <div
                  key={option.value}
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  data-index={index}
                  className={`game-select-option ${index === active ? "is-active" : ""} ${option.value === value ? "is-selected" : ""}`}
                  onPointerMove={() => setActive(index)}
                  onClick={() => choose(index)}
                >
                  <span>
                    <strong>{option.label}</strong>
                    {option.description && <small>{option.description}</small>}
                  </span>
                  {option.value === value && <Check size={13} />}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
