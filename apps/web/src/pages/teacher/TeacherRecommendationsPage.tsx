import React from 'react';
import { PageHeader } from '../../shared/components/PageHeader';
import { DetailsForTeacher } from '../../features/pedagogical-agent';

export const TeacherRecommendationsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        role="teacher"
        title="Student Practice Details"
        titleSi="ශිෂ්‍ය පුහුණු දත්ත වාර්තාව"
        description="දරුවා ගණිත ක්‍රීඩාවේදී ප්‍රශ්න වලට පිළිතුරු දුන් කාලය, උත්සාහයන් සහ හෝඩුවාවන් භාවිතා කළ ආකාරය."
      />

      <DetailsForTeacher />
    </div>
  );
};

export default TeacherRecommendationsPage;
