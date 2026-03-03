/** Page With Header component. */
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/molecules/LayoutAndNavigation/PageHeader";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("LayoutAndNavigation/PageWithHeader.tsx");

interface PageWithHeaderProps {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  backLink?: string;
  children: React.ReactNode;
}

export function PageWithHeader({
  title,
  description,
  icon,
  backLink,
  children,
}: PageWithHeaderProps) {
  return (
    <div className={classes[0]}>
      <div className={classes[1]}>
        {backLink && (
          <Button variant="ghost" size="icon" asChild>
            <Link href={backLink}>
              <ArrowLeft className={classes[2]} />
            </Link>
          </Button>
        )}
        <div className={backLink ? "flex-1 min-w-0" : "w-full"}>
          <PageHeader title={title} description={description} icon={icon} />
        </div>
      </div>
      {children}
    </div>
  );
}
