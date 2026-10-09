import type { AgentConfig } from '../types/agent.types';

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;

export const initAudio = () => {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
};

export const playAgentSound = (actionName: string, config: AgentConfig) => {
  initAudio();
  if (!ctx) return;
  
  const t = ctx.currentTime;
  const pitchScale = config.voice.pitch || 1.0;
  const waveType = config.voice.waveType || 'sine';
  
  const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol = 0.1) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq * pitchScale, startTime);
    osc.frequency.exponentialRampToValueAtTime((freq * 0.8) * pitchScale, startTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const playNoise = (startTime: number, duration: number, filterFreq: number, vol = 0.2) => {
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; 
    }
    
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.5;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noiseSource.start(startTime);
  };

  switch(actionName) {
    case 'wave':
      playTone(440, waveType, t, 0.15);
      playTone(554, waveType, t + 0.15, 0.15);
      playTone(659, waveType, t + 0.3, 0.3);
      break;
    case 'thinking':
      for(let i=0; i<6; i++){
        playTone(600 + Math.random() * 400, 'square', t + (i * 0.2), 0.1, 0.05);
        playNoise(t + (i * 0.2), 0.05, 2000, 0.05);
      }
      break;
    case 'correctCelebrate':
      playTone(523.25, waveType, t, 0.15, 0.15); 
      playTone(659.25, waveType, t+0.15, 0.15, 0.15); 
      playTone(783.99, waveType, t+0.3, 0.15, 0.15); 
      playTone(1046.50, waveType, t+0.45, 0.4, 0.15); 
      playNoise(t, 0.5, 3000, 0.1); 
      break;
    case 'tryAgain':
      playTone(400, 'triangle', t, 0.3);
      playTone(320, 'triangle', t + 0.3, 0.4);
      break;
    case 'clap':
      for (let i=0; i<5; i++) {
        playNoise(t + (i * 0.25), 0.15, 1500, 0.3);
      }
      break;
    case 'explain':
    case 'smallHint':
    case 'guidedHint':
      playTone(600, waveType, t, 0.15);
      playTone(750, waveType, t+0.2, 0.2);
      playNoise(t, 0.3, 800, 0.05);
      break;
    case 'pointLeft':
    case 'pointRight':
      playTone(800, waveType, t, 0.2);
      playNoise(t, 0.2, 2500, 0.1);
      break;
    case 'encourage':
      playTone(500, waveType, t, 0.15);
      playTone(800, waveType, t+0.2, 0.3);
      break;
  }
};
