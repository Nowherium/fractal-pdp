import type { HTMLAttributes, ReactNode } from "react";

function Panel({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "mb-5 rounded-lg border border-border-strong bg-panel p-[15px]",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export default Panel;
