import Button from "./ui/Button";

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
          <Button
            key={pageItem.key}
            variant={isActive ? "tab-active" : "tab"}
            className='mb-1.5 mt-0 rounded-md'
            onClick={() => setPage(pageItem.key)}
          >
            {pageItem.label}
          </Button>
        );
      })}
    </div>
  );
}

export default PageTabs;
