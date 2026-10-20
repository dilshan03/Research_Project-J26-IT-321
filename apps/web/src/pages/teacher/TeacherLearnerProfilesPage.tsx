import React from 'react';
import { PageHeader } from '../../shared/components/PageHeader';
import { DetailsForTeacher } from '../../features/pedagogical-agent';

export const TeacherLearnerProfilesPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        role="teacher"
        title="Learner Profiles"
        titleSi="ශිෂ්‍ය ඉගෙනුම් විස්තර"
        description="දරුවා ගණිත පුහුණු ක්‍රීඩාවේදී ලබාගත් ලකුණු සහ ප්‍රශ්න වලට පිළිතුරු දුන් ආකාරය."
      />

      <DetailsForTeacher />
    </div>
  );
};

export default TeacherLearnerProfilesPage;
