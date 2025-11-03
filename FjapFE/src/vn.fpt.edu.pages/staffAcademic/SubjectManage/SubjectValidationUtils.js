// Suggested path: src/vn.fpt.edu.utils/SubjectValidationUtils.js

/**
 * Calculate total weight from grade types array
 */
export const calculateTotalWeight = (gradeTypes) => {
  if (!gradeTypes || gradeTypes.length === 0) return 0;
  return gradeTypes.reduce((sum, gt) => {
    const weight = parseFloat(gt?.weight);
    return sum + (isNaN(weight) ? 0 : weight);
  }, 0);
};

/**
 * Validate if total weight equals 100%
 */
export const isWeightValid = (gradeTypes) => {
  const total = calculateTotalWeight(gradeTypes);
  return Math.abs(total - 100) < 0.01;
};

/**
 * Check for duplicate grade type names
 */
export const hasDuplicateNames = (gradeTypes) => {
  if (!gradeTypes || gradeTypes.length === 0) return false;
  
  const names = gradeTypes
    .map(gt => gt?.gradeTypeName?.trim().toLowerCase())
    .filter(Boolean);
  
  const uniqueNames = new Set(names);
  return names.length !== uniqueNames.size;
};

/**
 * Get list of duplicate grade type names
 */
export const getDuplicateNames = (gradeTypes) => {
  if (!gradeTypes || gradeTypes.length === 0) return [];
  
  const names = gradeTypes
    .map(gt => gt?.gradeTypeName?.trim().toLowerCase())
    .filter(Boolean);
  
  const duplicates = names.filter((name, index) => 
    names.indexOf(name) !== index
  );
  
  return [...new Set(duplicates)];
};

/**
 * Validate individual grade type
 */
export const validateGradeType = (gradeType) => {
  const errors = [];
  
  if (!gradeType.gradeTypeName || gradeType.gradeTypeName.trim() === '') {
    errors.push('Grade type name is required');
  }
  
  if (gradeType.gradeTypeName && gradeType.gradeTypeName.length > 100) {
    errors.push('Grade type name cannot exceed 100 characters');
  }
  
  const weight = parseFloat(gradeType.weight);
  if (isNaN(weight)) {
    errors.push('Weight must be a number');
  } else if (weight <= 0 || weight > 100) {
    errors.push('Weight must be between 0 and 100');
  }
  
  return errors;
};

/**
 * Validate entire grade types array
 */
export const validateAllGradeTypes = (gradeTypes) => {
  const errors = [];
  
  // Check if empty
  if (!gradeTypes || gradeTypes.length === 0) {
    errors.push('At least one grade type is required');
    return errors;
  }
  
  // Check total weight
  if (!isWeightValid(gradeTypes)) {
    const total = calculateTotalWeight(gradeTypes);
    errors.push(`Total weight must equal 100%. Current total: ${total.toFixed(2)}%`);
  }
  
  // Check for duplicates
  if (hasDuplicateNames(gradeTypes)) {
    const duplicates = getDuplicateNames(gradeTypes);
    errors.push(`Duplicate grade type names found: ${duplicates.join(', ')}`);
  }
  
  // Validate each grade type
  gradeTypes.forEach((gt, index) => {
    const gtErrors = validateGradeType(gt);
    if (gtErrors.length > 0) {
      errors.push(`Grade type #${index + 1}: ${gtErrors.join(', ')}`);
    }
  });
  
  return errors;
};

/**
 * Common grade type presets
 */
export const GRADE_TYPE_PRESETS = {
  'Standard (Assignment + Midterm + Final)': [
    { gradeTypeName: 'Assignment', weight: 20 },
    { gradeTypeName: 'Midterm', weight: 30 },
    { gradeTypeName: 'Final', weight: 50 },
  ],
  'Lab-based (Lab + Project + Final)': [
    { gradeTypeName: 'Lab Exercises', weight: 30 },
    { gradeTypeName: 'Project', weight: 30 },
    { gradeTypeName: 'Final Exam', weight: 40 },
  ],
  'Project-focused (Assignments + Project + Presentation)': [
    { gradeTypeName: 'Assignments', weight: 25 },
    { gradeTypeName: 'Project', weight: 50 },
    { gradeTypeName: 'Presentation', weight: 25 },
  ],
  'Quiz-based (Quizzes + Midterm + Final)': [
    { gradeTypeName: 'Quizzes', weight: 20 },
    { gradeTypeName: 'Midterm', weight: 30 },
    { gradeTypeName: 'Final', weight: 50 },
  ],
  'Continuous Assessment': [
    { gradeTypeName: 'Quiz 1', weight: 10 },
    { gradeTypeName: 'Quiz 2', weight: 10 },
    { gradeTypeName: 'Assignment 1', weight: 15 },
    { gradeTypeName: 'Assignment 2', weight: 15 },
    { gradeTypeName: 'Midterm', weight: 20 },
    { gradeTypeName: 'Final', weight: 30 },
  ],
};

/**
 * Get color for weight percentage
 */
export const getWeightColor = (weight) => {
  if (weight >= 40) return '#52c41a'; // Green for high weight
  if (weight >= 20) return '#1890ff'; // Blue for medium weight
  return '#faad14'; // Orange for low weight
};

/**
 * Format weight for display
 */
export const formatWeight = (weight) => {
  const numWeight = parseFloat(weight);
  return isNaN(numWeight) ? '0.00' : numWeight.toFixed(2);
};