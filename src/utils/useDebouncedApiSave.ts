import { useCallback, useRef } from "react";
import { saveEntity } from "./api";

export const useDebouncedApiSave = ({
  ready,
  isHydratingRef,
  setSaveStatus,
  delay = 400,
}) => {
  const saveTimers = useRef({});

  return useCallback(
    (key, endpoint, payload, method = "PATCH") => {
      if (!ready || isHydratingRef.current) {
        return undefined;
      }

      if (saveTimers.current[key]) {
        clearTimeout(saveTimers.current[key]);
      }

      setSaveStatus("Sauvegarde en cours...");

      saveTimers.current[key] = window.setTimeout(async () => {
        try {
          await saveEntity(endpoint, payload, method);
          const now = new Date().toLocaleTimeString();
          setSaveStatus("Sauvegardé à " + now);
          window.setTimeout(() => {
            setSaveStatus("(Auto-sauvegarde active)");
          }, 2000);
        } catch (error) {
          console.error(error);
          setSaveStatus(error?.message || "Erreur de sauvegarde");
        }
      }, delay);

      return () => {
        if (saveTimers.current[key]) {
          clearTimeout(saveTimers.current[key]);
        }
      };
    },
    [delay, isHydratingRef, ready, setSaveStatus],
  );
};
