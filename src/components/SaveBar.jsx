function SaveBar({
  saveStatus,
  exportData,
  importData,
  resetData,
  fileInputRef,
}) {
  return (
    <div className='save-bar'>
      <strong style={{ color: "#00bcd4" }}>💾 BASE DE DONNÉES :</strong>
      <span
        style={{
          color: "#69f0ae",
          fontSize: "0.9em",
          marginRight: "auto",
        }}
      >
        {saveStatus}
      </span>
      <button type='button' onClick={exportData}>
        📥 Exporter
      </button>
      <label className='file-label' htmlFor='fileImport'>
        📤 Importer
      </label>
      <input
        ref={fileInputRef}
        id='fileImport'
        type='file'
        accept='.json'
        onChange={importData}
      />
      <button className='btn-del' type='button' onClick={resetData}>
        ⚠️ Tout effacer
      </button>
    </div>
  );
}

export default SaveBar;
