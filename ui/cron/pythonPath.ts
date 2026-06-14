import path from 'path';
import fs from 'fs';
import { TOOLKIT_ROOT } from './paths';

const isWindows = process.platform === 'win32';

// Shared resolver used by both the cron worker and Next.js API routes
// so the Python interpreter is configured in exactly one place.
export const resolvePythonPath = (): string => {
  const candidates: string[] = [];
  const configuredPython = process.env.AITK_PYTHON_PATH;
  if (configuredPython) {
    candidates.push(configuredPython);
  }

  if (isWindows) {
    candidates.push(path.join(TOOLKIT_ROOT, '.venv', 'Scripts', 'python.exe'));
    candidates.push(path.join(TOOLKIT_ROOT, 'venv', 'Scripts', 'python.exe'));
  } else {
    candidates.push(path.join(TOOLKIT_ROOT, '.venv', 'bin', 'python'));
    candidates.push(path.join(TOOLKIT_ROOT, 'venv', 'bin', 'python'));
  }

  const activeEnvironment = process.env.VIRTUAL_ENV || process.env.CONDA_PREFIX;
  if (activeEnvironment) {
    candidates.push(
      isWindows
        ? path.join(activeEnvironment, 'Scripts', 'python.exe')
        : path.join(activeEnvironment, 'bin', 'python'),
    );
  }

  for (const candidate of candidates) {
    const resolvedCandidate = path.resolve(candidate);
    if (fs.existsSync(resolvedCandidate) && fs.statSync(resolvedCandidate).isFile()) {
      return resolvedCandidate;
    }
  }

  throw new Error(
    `No Python environment found. Create a venv in ${TOOLKIT_ROOT} or set AITK_PYTHON_PATH.`,
  );
};
