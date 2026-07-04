import { calculateBAC } from './src/utils/mathEngine';
console.log("Male 180lbs: ", calculateBAC(3, 40, 180, 'male', 0));
console.log("Male 180lbs + beer: ", calculateBAC(3, 40, 180, 'male', 0) + calculateBAC(12, 5, 180, 'male', 0));
console.log("Female 140lbs + beer: ", calculateBAC(3, 40, 140, 'female', 0) + calculateBAC(12, 5, 140, 'female', 0));
