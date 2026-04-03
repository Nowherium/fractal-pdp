import { useCallback, useRef, type MutableRefObject } from "react";
import { saveEntity } from "./api";

type SaveStatusSetter = (status: string) => void;
type HttpMethod = "PATCH" | "PUT" | "DELETE";

interface UseDebouncedApiSaveParams {
  ready: boolean;
  isHydratingRef: MutableRefObject<boolean>;
  setSaveStatus: SaveStatusSetter;
  delay?: number;
}

export const useDebouncedApiSave = ({
  ready,
  isHydratingRef,
  setSaveStatus,
  delay = 400,
}: UseDebouncedApiSaveParams) => {
  const saveTimers = useRef<Record<string, number>>({});

  return useCallback(
    (
      key: string,
      endpoint: string,
      payload?: unknown,
      method: HttpMethod = "PATCH",
    ) => {
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
          setSaveStatus(
            error instanceof Error ? error.message : "Erreur de sauvegarde",
          );
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
