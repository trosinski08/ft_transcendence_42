import { DIFFICULTY_PRESETS } from '../ai/difficultyPresets';
import type { AIDifficulty } from '../ai/aiTypes';

let aiEnabled = false;
let aiDifficulty: AIDifficulty = 'NORMAL';

export function loadAiState(storageKey: string){
  try{ const raw = localStorage.getItem(storageKey); if (raw){ const parsed = JSON.parse(raw); if (typeof parsed.enabled === 'boolean') aiEnabled = parsed.enabled; if (typeof parsed.difficulty === 'string' && parsed.difficulty.toUpperCase() in DIFFICULTY_PRESETS) aiDifficulty = parsed.difficulty.toUpperCase() as AIDifficulty; } }catch{}
}
export function persistAiState(storageKey: string){ try{ localStorage.setItem(storageKey, JSON.stringify({ enabled: aiEnabled, difficulty: aiDifficulty })); }catch{} }
export function setAiEnabled(v:boolean){ aiEnabled = !!v; }
export function setAiDifficulty(d:AIDifficulty){ aiDifficulty = d; }
export function getAiEnabled(){ return aiEnabled; }
export function getAiDifficulty(){ return aiDifficulty; }

export function wireAiUi(onToggle: (enabled:boolean)=>void, onChangeDifficulty: (d:AIDifficulty)=>void){
  const aiToggle = document.getElementById('ai-toggle') as HTMLInputElement | null;
  const aiSelect = document.getElementById('ai-difficulty') as HTMLSelectElement | null;
  if (aiToggle){ aiToggle.checked = aiEnabled; aiToggle.addEventListener('change', ()=>{ aiEnabled = aiToggle.checked; onToggle(aiEnabled); persistAiState('ft_transcendence_ai_settings_v1'); }); }
  if (aiSelect){ aiSelect.value = aiDifficulty; aiSelect.addEventListener('change', ()=>{ aiDifficulty = (aiSelect.value||'NORMAL') as AIDifficulty; onChangeDifficulty(aiDifficulty); persistAiState('ft_transcendence_ai_settings_v1'); }); }
}
