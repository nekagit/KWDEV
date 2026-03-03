"use client";

/** Simple Dashboard component. Empty. */
import React from "react";

export interface SimpleDashboardProps {
  setActiveProjects?: (paths: string[] | ((prev: string[]) => string[])) => void;
}

export function SimpleDashboard(_props: SimpleDashboardProps = {}) {
  return <div />;
}
