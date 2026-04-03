import type { ChangeEvent, RefObject } from "react";

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
    <div className='mb-5 flex flex-wrap items-center gap-[15px] rounded-[5px] border border-accent-cyan bg-[#0a0a0a] p-[15px]'>
      <strong className='text-accent-cyan'>💾 BASE DE DONNÉES :</strong>
      <span className='mr-auto text-[0.9em] text-accent-green'>
        {saveStatus}
      </span>
      <button className='mt-0' type='button' onClick={exportData}>
        📥 Exporter
      </button>
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
      <button className='btn-del mt-0' type='button' onClick={resetData}>
        ⚠️ Tout effacer
      </button>
    </div>
  );
}

export default SaveBar;
