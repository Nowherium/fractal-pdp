import type { HTMLAttributes } from "react";

function InfoText({
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={["mb-2.5 text-[0.85em] italic text-[#888]", className].join(
        " ",
      )}
      {...props}
    />
  );
}

export default InfoText;
