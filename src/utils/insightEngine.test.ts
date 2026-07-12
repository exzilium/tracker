import { generateInsight } from './insightEngine';

describe('Insight Engine', () => {
  it('should return Critical physical override', () => {
    const msg = generateInsight({
      tensionPercent: 120, currentBAC: 0.08, maxBAC: 0.08, currentTHC: 0, maxTHC: 10,
      mood: 3, hunger: 3, anxiety: 3
    });
    expect(msg).toBe("Your physical BAC has crossed your limit. Stop consuming.");
  });

  it('should return Impending Spike override', () => {
    const msg = generateInsight({
      tensionPercent: 50, currentBAC: 0.02, maxBAC: 0.08, currentTHC: 0, maxTHC: 10,
      mood: 3, hunger: 3, anxiety: 3, isProjectedToSpike: true
    });
    expect(msg).toBe("You might feel fine now, but projected digestion shows you approaching your limits soon. Consider slowing down.");
  });

  it('should return Deceptive Drop override', () => {
    const msg = generateInsight({
      tensionPercent: 60, currentBAC: 0.04, maxBAC: 0.08, currentTHC: 0, maxTHC: 10,
      mood: 3, hunger: 3, anxiety: 3, didTensionDrop: true, isBACRising: true
    });
    expect(msg).toBe("You might be feeling more relaxed, but your physical BAC is still climbing. Coast for a bit.");
  });

  it('should build modular crossfade message', () => {
    const msg = generateInsight({
      tensionPercent: 90, currentBAC: 0.04, maxBAC: 0.08, currentTHC: 5, maxTHC: 10,
      mood: 3, hunger: 3, anxiety: 3
    });
    expect(msg).toBe("Your levels are elevated, and the cross-fade is likely amplifying your buzz. Switch to water for a bit to let things settle.");
  });

  it('should build modular hunger message', () => {
    const msg = generateInsight({
      tensionPercent: 80, currentBAC: 0.06, maxBAC: 0.08, currentTHC: 0, maxTHC: 10,
      mood: 3, hunger: 5, anxiety: 3
    });
    expect(msg).toBe("You're at an ideal level, and an empty stomach might be making things hit harder. Try to grab some carbs.");
  });

  it('should build modular mental message', () => {
    const msg = generateInsight({
      tensionPercent: 80, currentBAC: 0.02, maxBAC: 0.08, currentTHC: 0, maxTHC: 10,
      mood: 3, hunger: 3, anxiety: 5
    });
    expect(msg).toBe("You're at an ideal level, and your current mood might be adding to the mental load. Take a breather or switch to water to protect your vibe.");
  });

  it('should build default taut message', () => {
    const msg = generateInsight({
      tensionPercent: 60, currentBAC: 0.04, maxBAC: 0.08, currentTHC: 0, maxTHC: 10,
      mood: 3, hunger: 3, anxiety: 3
    });
    expect(msg).toBe("You're at an ideal level. Pace yourself and enjoy the ride.");
  });

  it('should override with comedown message when physically sober but past peak', () => {
    const msg = generateInsight({
      tensionPercent: 30, currentBAC: 0, maxBAC: 0.08, currentTHC: 0, maxTHC: 10,
      peakBAC: 0.06, peakTHC: 0,
      mood: 3, hunger: 3, anxiety: 3
    });
    expect(msg).toBe("You're physically back down. You might still feel some lingering effects, so take it easy if you decide to go back up.");
  });
});
