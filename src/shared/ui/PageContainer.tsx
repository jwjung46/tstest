import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function PageContainer({
  children,
  className,
}: PageContainerProps) {
  const classes = ["page-container", className].filter(Boolean).join(" ");

  return <main className={classes}>{children}</main>;
}
