function PageTabs({ pages, currentPage, setPage }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
        margin: "20px 0",
      }}
    >
      {pages.map((pageItem) => (
        <button
          key={pageItem.key}
          type='button'
          onClick={() => setPage(pageItem.key)}
          style={{
            marginBottom: "6px",
            padding: "10px 16px",
            border: "1px solid #444",
            borderRadius: "6px",
            background: currentPage === pageItem.key ? "#00bcd4" : "#111",
            color: currentPage === pageItem.key ? "#000" : "#fff",
            cursor: "pointer",
          }}
        >
          {pageItem.label}
        </button>
      ))}
    </div>
  );
}

export default PageTabs;
