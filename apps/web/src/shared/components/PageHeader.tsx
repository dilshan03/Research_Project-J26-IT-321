import React from 'react';
import { DashboardBreadcrumb } from './DashboardBreadcrumb';

export interface PageHeaderProps {
  role?: 'parent' | 'teacher';
  title: string;
  titleSi?: string;
  description?: string;
  descriptionSi?: string;
  actions?: React.ReactNode;
  breadcrumbItems?: { label: string; path?: string }[];
  showBreadcrumb?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  role = 'parent',
  title,
  titleSi,
  description,
  descriptionSi,
  actions,
  breadcrumbItems,
  showBreadcrumb = true,
}) => {
  return (
    <div className="space-y-3 pb-2 border-b border-mq-border/70">
      {/* 1. Breadcrumb */}
      {showBreadcrumb && (
        <div>
          <DashboardBreadcrumb role={role} items={breadcrumbItems} />
        </div>
      )}

      {/* 2. Title, Subtitle, Description & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-mq-text-strong tracking-tight">
              {title}
            </h1>
            {titleSi && (
              <span className="text-base sm:text-lg font-bold text-mq-primary font-sinhala">
                ({titleSi})
              </span>
            )}
          </div>

          {(description || descriptionSi) && (
            <p className="text-xs sm:text-sm text-mq-text-muted max-w-3xl leading-relaxed">
              {description}
              {descriptionSi && (
                <span className="block text-xs text-mq-text-muted/90 font-sinhala mt-0.5">
                  {descriptionSi}
                </span>
              )}
            </p>
          )}
        </div>

        {/* 3. Primary Page Action slot */}
        {actions && <div className="shrink-0 flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
