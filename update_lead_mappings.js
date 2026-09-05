import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'hooks', 'useLeads.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const additionalFieldsAdd = `
        age: leadData.age,
        gender: leadData.gender,
        education: leadData.education,
        graduation_percentage: leadData.graduationPercentage,
        twelfth_percentage: leadData.twelfthPercentage,
        tenth_percentage: leadData.tenthPercentage,
        current_occupation: leadData.currentOccupation,
        years_of_experience: leadData.yearsOfExperience,
        industry: leadData.industry,
        annual_income: leadData.annualIncome,
        preferred_specialization: leadData.preferredSpecialization,
        preferred_learning_mode: leadData.preferredLearningMode,
        career_goal: leadData.careerGoal,
        need_placement_support: leadData.needPlacementSupport,
        need_scholarship: leadData.needScholarship,
        need_emi: leadData.needEmi,
        preferred_intake: leadData.preferredIntake,
        tenth_board: leadData.tenthBoard,
        tenth_passing_year: leadData.tenthPassingYear,
        twelfth_board: leadData.twelfthBoard,
        twelfth_stream: leadData.twelfthStream,
        twelfth_passing_year: leadData.twelfthPassingYear,
        graduation_degree: leadData.graduationDegree,
        graduation_university: leadData.graduationUniversity,
        graduation_passing_year: leadData.graduationPassingYear,
        graduation_backlogs: leadData.graduationBacklogs,
        graduation_mode: leadData.graduationMode,
        post_graduation_degree: leadData.postGraduationDegree,
        post_graduation_university: leadData.postGraduationUniversity,
        post_graduation_percentage: leadData.postGraduationPercentage,
        post_graduation_passing_year: leadData.postGraduationPassingYear,
        gap_years: leadData.gapYears,
        gap_explanation: leadData.gapExplanation,
        company: leadData.company,
        job_title: leadData.jobTitle,
        employment_status: leadData.employmentStatus,
        target_role: leadData.targetRole,
        motivation: leadData.motivation,
        urgency: leadData.urgency,
        university_brand_preference: leadData.universityBrandPreference,
        lost_reason: leadData.lostReason,
        competitor: leadData.competitor,`;

const additionalFieldsUpdate = `
      if (updates.age !== undefined) payload.age = updates.age;
      if (updates.gender !== undefined) payload.gender = updates.gender;
      if (updates.education !== undefined) payload.education = updates.education;
      if (updates.graduationPercentage !== undefined) payload.graduation_percentage = updates.graduationPercentage;
      if (updates.twelfthPercentage !== undefined) payload.twelfth_percentage = updates.twelfthPercentage;
      if (updates.tenthPercentage !== undefined) payload.tenth_percentage = updates.tenthPercentage;
      if (updates.currentOccupation !== undefined) payload.current_occupation = updates.currentOccupation;
      if (updates.yearsOfExperience !== undefined) payload.years_of_experience = updates.yearsOfExperience;
      if (updates.industry !== undefined) payload.industry = updates.industry;
      if (updates.annualIncome !== undefined) payload.annual_income = updates.annualIncome;
      if (updates.preferredSpecialization !== undefined) payload.preferred_specialization = updates.preferredSpecialization;
      if (updates.preferredLearningMode !== undefined) payload.preferred_learning_mode = updates.preferredLearningMode;
      if (updates.careerGoal !== undefined) payload.career_goal = updates.careerGoal;
      if (updates.needPlacementSupport !== undefined) payload.need_placement_support = updates.needPlacementSupport;
      if (updates.needScholarship !== undefined) payload.need_scholarship = updates.needScholarship;
      if (updates.needEmi !== undefined) payload.need_emi = updates.needEmi;
      if (updates.preferredIntake !== undefined) payload.preferred_intake = updates.preferredIntake;
      if (updates.tenthBoard !== undefined) payload.tenth_board = updates.tenthBoard;
      if (updates.tenthPassingYear !== undefined) payload.tenth_passing_year = updates.tenthPassingYear;
      if (updates.twelfthBoard !== undefined) payload.twelfth_board = updates.twelfthBoard;
      if (updates.twelfthStream !== undefined) payload.twelfth_stream = updates.twelfthStream;
      if (updates.twelfthPassingYear !== undefined) payload.twelfth_passing_year = updates.twelfthPassingYear;
      if (updates.graduationDegree !== undefined) payload.graduation_degree = updates.graduationDegree;
      if (updates.graduationUniversity !== undefined) payload.graduation_university = updates.graduationUniversity;
      if (updates.graduationPassingYear !== undefined) payload.graduation_passing_year = updates.graduationPassingYear;
      if (updates.graduationBacklogs !== undefined) payload.graduation_backlogs = updates.graduationBacklogs;
      if (updates.graduationMode !== undefined) payload.graduation_mode = updates.graduationMode;
      if (updates.postGraduationDegree !== undefined) payload.post_graduation_degree = updates.postGraduationDegree;
      if (updates.postGraduationUniversity !== undefined) payload.post_graduation_university = updates.postGraduationUniversity;
      if (updates.postGraduationPercentage !== undefined) payload.post_graduation_percentage = updates.postGraduationPercentage;
      if (updates.postGraduationPassingYear !== undefined) payload.post_graduation_passing_year = updates.postGraduationPassingYear;
      if (updates.gapYears !== undefined) payload.gap_years = updates.gapYears;
      if (updates.gapExplanation !== undefined) payload.gap_explanation = updates.gapExplanation;
      if (updates.company !== undefined) payload.company = updates.company;
      if (updates.jobTitle !== undefined) payload.job_title = updates.jobTitle;
      if (updates.employmentStatus !== undefined) payload.employment_status = updates.employmentStatus;
      if (updates.targetRole !== undefined) payload.target_role = updates.targetRole;
      if (updates.motivation !== undefined) payload.motivation = updates.motivation;
      if (updates.urgency !== undefined) payload.urgency = updates.urgency;
      if (updates.universityBrandPreference !== undefined) payload.university_brand_preference = updates.universityBrandPreference;
      if (updates.lostReason !== undefined) payload.lost_reason = updates.lostReason;
      if (updates.competitor !== undefined) payload.competitor = updates.competitor;`;

// Insert into addLead
content = content.replace(
  `        custom_fields: leadData.customFields || {}`,
  `${additionalFieldsAdd}\n        custom_fields: leadData.customFields || {}`
);

// Insert into updateLead
content = content.replace(
  `      if (updates.customFields !== undefined) payload.custom_fields = updates.customFields;`,
  `      if (updates.customFields !== undefined) payload.custom_fields = updates.customFields;\n${additionalFieldsUpdate}`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully added mappings to useLeads.ts');
