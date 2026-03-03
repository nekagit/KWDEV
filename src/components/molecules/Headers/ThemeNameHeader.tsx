/** Theme Name Header component. */
import React from 'react';

interface ThemeNameHeaderProps {
  themeName: string;
}

const ThemeNameHeader: React.FC<ThemeNameHeaderProps> = ({ themeName }) => {
  return (
    <h2 className="text-xl font-semibold text-inherit">
      {themeName}
    </h2>
  );
};

export default ThemeNameHeader;
