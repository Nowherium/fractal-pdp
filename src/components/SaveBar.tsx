import Button from "./ui/Button";
import Panel from "./ui/Panel";

import type { ChangeEvent, RefObject } from "react";

import { confirmAction } from "../utils/confirmAction";

function SaveBar({
  saveStatus,
  exportData,
  importData,
  resetData,
  fileInputRef,
}: {
  saveStatus: string;
  exportData: () => void;
  importData: (event: ChangeEvent<HTMLInputElement>) => void;
  resetData: () => void;
  fileInputRef: RefObject<HTMLInputElement>;
}) {
  return (
    <Panel className='flex flex-wrap items-center gap-[15px] border-accent-cyan bg-[#0a0a0a]'>
      <strong className='text-accent-cyan'>💾 BASE DE DONNÉES :</strong>
      <span className='mr-auto text-[0.9em] text-accent-green'>
        {saveStatus}
      </span>
      <Button className='mt-0' onClick={exportData}>
        📥 Exporter
      </Button>
      <label
        className='mt-0 inline-block cursor-pointer rounded-[3px] bg-accent-orange px-3 py-2 font-bold text-page hover:bg-[#e6a545]'
        htmlFor='fileImport'
      >
        📤 Importer
      </label>
      <input
        ref={fileInputRef}
        id='fileImport'
        type='file'
        accept='.json'
        className='hidden'
        onChange={importData}
      />
      <Button
        className='mt-0'
        variant='danger'
        onClick={() =>
          confirmAction(
            "Tout effacer ? Cette action réinitialise toutes les données et est irréversible.",
            resetData,
          )
        }
      >
        ⚠️ Tout effacer
      </Button>
    </Panel>
  );
}

export default SaveBar;
