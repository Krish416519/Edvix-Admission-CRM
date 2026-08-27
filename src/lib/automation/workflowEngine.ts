import { v4 as uuidv4 } from 'uuid';
import { 
  SystemEvent, 
  Workflow, 
  WorkflowRun, 
  ConditionNode,
  WorkflowAction
} from '../../types/automation';

// Max execution depth to prevent infinite loops (Workflow A -> Workflow B -> Workflow A)
const MAX_EXECUTION_DEPTH = 10;

/**
 * Entry point for evaluating events against active workflows
 */
export async function evaluateWorkflows(event: SystemEvent) {
  // In a real backend, we would query the database:
  // SELECT * FROM workflows WHERE trigger = event.event_type AND status = 'Active'
  const activeWorkflows: Workflow[] = []; // Mock fetching

  for (const workflow of activeWorkflows) {
    await processWorkflow(workflow, event);
  }
}

async function processWorkflow(workflow: Workflow, event: SystemEvent, currentDepth: number = 0) {
  if (currentDepth >= MAX_EXECUTION_DEPTH) {
    console.error(`[WorkflowEngine] Max execution depth exceeded for workflow ${workflow.id}`);
    return;
  }

  // 1. Evaluate Conditions
  const conditionsMet = evaluateConditionTree(workflow.conditions_tree, event.payload);
  if (!conditionsMet) return;

  // 2. Setup Workflow Run (Idempotency check happens here in DB)
  const runId = uuidv4();
  const idempotencyKey = `${event.id}_${workflow.id}`;
  
  const run: WorkflowRun = {
    id: runId,
    workflow_id: workflow.id as string,
    workflow_version: workflow.version,
    trigger_event_id: event.id,
    trigger_event_type: event.event_type,
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    status: 'In Progress',
    idempotency_key: idempotencyKey,
    execution_depth: currentDepth,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 3. Execute Actions Sequentially
  for (const action of workflow.actions) {
    try {
      await executeAction(action, event, run);
    } catch (err: any) {
      run.status = 'Failed';
      run.error_message = err.message;
      // Route to Dead Letter Queue
      routeToFailureQueue(run, action, err);
      break; // Stop execution on failure
    }
  }

  if (run.status === 'In Progress') {
    run.status = 'Completed';
  }
}

/**
 * Recursively evaluates a condition tree against the event payload payload variables
 */
function evaluateConditionTree(node: ConditionNode, payload: Record<string, any>): boolean {
  if (node.type === 'condition') {
    return evaluateSingleCondition(node, payload);
  }

  if (node.type === 'group' && node.conditions) {
    if (node.logic === 'AND') {
      return node.conditions.every(c => evaluateConditionTree(c, payload));
    }
    if (node.logic === 'OR') {
      return node.conditions.some(c => evaluateConditionTree(c, payload));
    }
    if (node.logic === 'NOT') {
      return !node.conditions.some(c => evaluateConditionTree(c, payload));
    }
  }

  return true;
}

function evaluateSingleCondition(node: ConditionNode, payload: Record<string, any>): boolean {
  if (!node.field || !node.operator) return true;
  
  const actualValue = resolveVariable(node.field, payload);
  const expectedValue = node.value;

  switch (node.operator) {
    case 'equals': return actualValue === expectedValue;
    case 'not_equals': return actualValue !== expectedValue;
    case 'contains': return String(actualValue).includes(String(expectedValue));
    case 'greater_than': return Number(actualValue) > Number(expectedValue);
    case 'less_than': return Number(actualValue) < Number(expectedValue);
    case 'exists': return actualValue !== undefined && actualValue !== null;
    case 'is_empty': return !actualValue || String(actualValue).trim() === '';
    // Implement others as needed
    default: return false;
  }
}

/**
 * Securely resolves variable paths (e.g. "lead.status") from payload
 * Prevents access to restricted fields like passwords or API keys
 */
function resolveVariable(path: string, payload: Record<string, any>): any {
  const restrictedFields = ['password', 'token', 'secret', 'key', 'credit_card'];
  
  if (restrictedFields.some(rf => path.toLowerCase().includes(rf))) {
    throw new Error(`Security Exception: Access to restricted field '${path}' is denied.`);
  }

  const parts = path.split('.');
  let current = payload;
  
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  
  return current;
}

/**
 * Routes actions to specific secure service handlers
 */
async function executeAction(action: WorkflowAction, event: SystemEvent, run: WorkflowRun) {
  // We strictly control the allowed transitions here instead of arbitrary SQL
  switch (action.type) {
    case 'Update Lead Status':
      // Call secure lead service transition logic
      break;
    case 'Send WhatsApp':
      // Implement rate limit check here
      break;
    case 'Request Approval':
      // Pause execution and notify approver
      run.status = 'Pending Approval';
      run.resume_at = 'Hold';
      break;
    case 'Wait':
      // Support for Delay node
      run.status = 'Delayed';
      // Calculate resume_at based on business hours
      break;
    default:
      console.log(`Executing ${action.type}`, action.metadata);
  }
}

function routeToFailureQueue(run: WorkflowRun, action: WorkflowAction, error: any) {
  console.error(`[Failure Queue] Workflow ${run.workflow_id} failed at node ${action.id}: ${error.message}`);
  // In a real app, write to `workflow_failure_queue` table
}
