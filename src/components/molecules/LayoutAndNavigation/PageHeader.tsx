/** Page Header component. */
import React from 'react';
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("LayoutAndNavigation/PageHeader.tsx");

interface PageHeaderProps {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, subtitle, icon }) => {
  const desc = description ?? subtitle;
  return (
    <div className={classes[0]}>
      {icon && <div className={classes[1]}>{icon}</div>}
      <div className={classes[2]}>
        {typeof title === 'string' ? <h1 className={classes[3]}>{title}</h1> : title}
        {desc && <p className={classes[4]}>{desc}</p>}
      </div>
    </div>
  );
};
