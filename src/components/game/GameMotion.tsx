import { createContext, useContext, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
const MotionPreference = createContext(true);
export const useStudioMotion = () => useContext(MotionPreference);
export default function GameMotion({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <MotionPreference.Provider value={enabled}>
      <MotionConfig
        reducedMotion={enabled ? "never" : "always"}
        transition={
          enabled
            ? { type: "spring", stiffness: 300, damping: 28 }
            : { duration: 0 }
        }
      >
        {children}
      </MotionConfig>
    </MotionPreference.Provider>
  );
}
