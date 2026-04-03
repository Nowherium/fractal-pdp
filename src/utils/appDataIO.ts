import type { RefObject } from "react";
import { resetState, saveState } from "./api";
import { buildFallbackState, buildState } from "./stateUtils";

export const exportStateData = (state) => {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `Escale_Simu_V9_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const importStateFile = (
  event: { target: { files?: FileList | null } },
  {
    fileInputRef,
    setCompleteState,
  }: {
    fileInputRef: RefObject<HTMLInputElement>;
    setCompleteState: (state: unknown) => void;
  },
) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (loadEvent) => {
    try {
      const rawText =
        typeof loadEvent.target?.result === "string"
          ? loadEvent.target.result
          : "";
      if (!rawText) {
        throw new Error("Fichier vide ou invalide");
      }

      const parsed = JSON.parse(rawText);
      const importedState = buildState(parsed);
      setCompleteState(importedState);
      await saveState(importedState);
    } catch (_error) {
      window.alert("Fichier invalide ou corrompu !");
    }
  };

  reader.readAsText(file);
  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
};

export const resetAppData = async ({ setCompleteState, setSaveStatus }) => {
  if (!window.confirm("Effacer TOUTES les données ?")) return;

  try {
    const data = await resetState();
    setCompleteState(data);
  } catch (error) {
    console.error(error);
    setCompleteState(buildFallbackState());
    setSaveStatus("(Auto-sauvegarde locale)");
  }
};
