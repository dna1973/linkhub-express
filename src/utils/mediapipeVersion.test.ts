import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MEDIAPIPE_MODEL_URL, MEDIAPIPE_VERSION, MEDIAPIPE_WASM_BASE } from './backgroundRemoval';

// A versão do MediaPipe aparece em três lugares. Se um ficar para trás, o app pede /mediapipe/<versão>/
// que o script não preparou, ou junta o bundle JS de uma versão com o motor WASM de outra.
const root = path.resolve(__dirname, '..', '..');

describe('versão do MediaPipe', () => {
  it('package.json, script de preparo e backgroundRemoval.ts usam a mesma versão', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    // Versão fixa, sem ^ ou ~: o motor servido precisa ser exatamente o do pacote
    expect(pkg.dependencies['@mediapipe/tasks-vision']).toBe(MEDIAPIPE_VERSION);

    const script = readFileSync(path.join(root, 'scripts', 'prepare-mediapipe.mjs'), 'utf8');
    expect(/const VERSION = '([^']+)'/.exec(script)?.[1]).toBe(MEDIAPIPE_VERSION);
  });

  it('os caminhos servidos carregam a versão', () => {
    expect(MEDIAPIPE_WASM_BASE).toBe(`/mediapipe/${MEDIAPIPE_VERSION}/wasm`);
    expect(MEDIAPIPE_MODEL_URL.startsWith(`/mediapipe/${MEDIAPIPE_VERSION}/models/`)).toBe(true);
  });
});
