import { getPlan, updateTaskStatus, PlanTask, getExecutableTasks } from "./planning";

export interface ExecutionResult {
  taskId: string;
  success: boolean;
  output?: string;
  error?: string;
  executionTime: number;
}

export async function executeTask(task: PlanTask): Promise<ExecutionResult> {
  const startTime = Date.now();
  
  try {
    // Mark as in progress
    updateTaskStatus(task.id, 'in_progress');
    
    // Simulate task execution
    await simulateExecution(task);
    
    // Mark as completed
    updateTaskStatus(task.id, 'completed');
    
    return {
      taskId: task.id,
      success: true,
      output: `Task "${task.description}" completed successfully`,
      executionTime: Date.now() - startTime
    };
  } catch (error) {
    updateTaskStatus(task.id, 'failed');
    
    return {
      taskId: task.id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      executionTime: Date.now() - startTime
    };
  }
}

async function simulateExecution(task: PlanTask): Promise<void> {
  // Simulate work based on effort score
  const delay = task.effort_score * 100; // 100ms per effort point
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // 5% chance of failure for simulation
  if (Math.random() < 0.05) {
    throw new Error("Simulated task failure");
  }
}

export async function executePlan(planId: string): Promise<ExecutionResult[]> {
  const plan = getPlan(planId);
  if (!plan) throw new Error("Plan not found");
  
  const results: ExecutionResult[] = [];
  
  // Execute tasks in order (respecting dependencies)
  const completedTaskIds = new Set<string>();
  
  while (completedTaskIds.size < plan.tasks.length) {
    // Find tasks that are ready (all dependencies completed)
    const readyTasks = plan.tasks.filter(t => 
      t.status === 'pending' && 
      t.dependencies.every(d => completedTaskIds.has(d))
    );
    
    if (readyTasks.length === 0) break; // Deadlock or all done
    
    // Execute ready tasks in parallel
    const batchResults = await Promise.all(
      readyTasks.map(t => executeTask(t))
    );
    
    results.push(...batchResults);
    
    // Mark successful tasks as completed for dependency resolution
    batchResults
      .filter(r => r.success)
      .forEach(r => completedTaskIds.add(r.taskId));
  }
  
  return results;
}

export function getExecutionStatus(planId: string): {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  inProgress: number;
} {
  const plan = getPlan(planId);
  if (!plan) throw new Error("Plan not found");
  
  return {
    total: plan.tasks.length,
    completed: plan.tasks.filter(t => t.status === 'completed').length,
    failed: plan.tasks.filter(t => t.status === 'failed').length,
    pending: plan.tasks.filter(t => t.status === 'pending').length,
    inProgress: plan.tasks.filter(t => t.status === 'in_progress').length
  };
}
