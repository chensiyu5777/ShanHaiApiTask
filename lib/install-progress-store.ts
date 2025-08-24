// 全局进度存储，避免Next.js热重载时丢失数据
interface InstallProgress {
  step: number;
  totalSteps: number;
  currentStep: string;
  progress: number;
  status: 'idle' | 'downloading' | 'installing' | 'configuring' | 'completed' | 'error';
  error?: string;
}

// 使用全局对象存储进度，避免模块热重载清除数据
declare global {
  var installProgressStore: Map<string, InstallProgress> | undefined;
}

// 初始化全局存储
if (!global.installProgressStore) {
  global.installProgressStore = new Map();
}

export const progressStore = global.installProgressStore;

export function setProgress(installId: string, progress: InstallProgress) {
  progressStore.set(installId, progress);
  console.log(`[ProgressStore] Set progress for ${installId}:`, progress);
}

export function getProgress(installId: string): InstallProgress | null {
  const progress = progressStore.get(installId) || null;
  console.log(`[ProgressStore] Get progress for ${installId}:`, progress);
  return progress;
}

export function deleteProgress(installId: string) {
  progressStore.delete(installId);
  console.log(`[ProgressStore] Deleted progress for ${installId}`);
}

export function getAllProgressIds(): string[] {
  return Array.from(progressStore.keys());
}