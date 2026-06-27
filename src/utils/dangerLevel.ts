const badMoodWarnings = [
  "Hey watch out, you're going to make a bad day worse.",
  "Alcohol is a depressant. Tread lightly today.",
  "Drinking when angry or sad usually backfires. Take it easy.",
  "Your mood is low. Pacing yourself is critical right now."
];

const goodMoodWarnings = [
  "Riding high! Enjoy responsibly so you don't take it too far and make that mood slider 0 tomorrow.",
  "Good vibes only. Don't ruin it with one too many.",
  "You're in a great mood! Keep it that way by knowing your limits.",
  "Pace yourself so the good times keep rolling."
];

const neutralWarnings = [
  "Slow down, you're nearing your limit.",
  "You're getting close to the edge. Time for water.",
  "Almost at your peak. Pacing is key."
];

const getRandomWarning = (arr: string[]) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const calculateDangerLevel = (
  currentBAC: number,
  maxBAC: number,
  peakTHC: number, // mg
  maxTHC: number,  // mg
  mood: number,    // 1-5
  hunger: number   // 1-5
): { dangerPercent: number, warningMsg: string | null } => {
  
  // Base danger is the highest percentage relative to either limit
  const bacDanger = maxBAC > 0 ? (currentBAC / maxBAC) * 100 : 0;
  const thcDanger = maxTHC > 0 ? (peakTHC / maxTHC) * 100 : 0;
  
  let baseDanger = Math.max(bacDanger, thcDanger);

  // Subjective Modifiers (Mathematical Penalty) based on 1-5 scale
  if (mood === 1 || mood === 5) baseDanger += 15;
  else if (mood === 2) baseDanger += 5;

  if (hunger === 5) baseDanger += 15;
  else if (hunger === 1 || hunger === 4) baseDanger += 5;

  let warningMsg = null;
  if (baseDanger >= 100) {
    warningMsg = "You've hit your limit. Time to stop.";
  } else if (baseDanger >= 75) {
    if (mood <= 2) {
      warningMsg = getRandomWarning(badMoodWarnings);
    } else if (mood === 5) {
      warningMsg = getRandomWarning(goodMoodWarnings);
    } else {
      warningMsg = getRandomWarning(neutralWarnings);
    }
    
    if (hunger >= 4) warningMsg += " Also, you need to eat something!";
    else if (hunger === 1) warningMsg += " You're too full to drink more comfortably.";
  }

  return {
    dangerPercent: Math.min(baseDanger, 200), // Cap at 200% for UI scaling
    warningMsg
  };
};
