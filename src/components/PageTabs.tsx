import type { AppPage, PageTab } from "../types";

function PageTabs({
  pages,
  currentPage,
  setPage,
}: {
  pages: PageTab[];
  currentPage: AppPage;
  setPage: (page: AppPage) => void;
}) {
  return (
    <div className='my-5 flex flex-wrap gap-2.5'>
      {pages.map((pageItem) => {
        const isActive = currentPage === pageItem.key;

        return (
          <button
            key={pageItem.key}
            type='button'
            className={[
              "mb-1.5 mt-0 rounded-md border border-border-strong px-4 py-2.5",
              isActive
                ? "bg-accent-cyan text-black"
                : "bg-table-bg text-white hover:bg-input-bg",
            ].join(" ")}
            onClick={() => setPage(pageItem.key)}
          >
            {pageItem.label}
          </button>
        );
      })}
    </div>
  );
}

export default PageTabs;
