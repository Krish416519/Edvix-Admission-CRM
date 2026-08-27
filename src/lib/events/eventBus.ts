import { v4 as uuidv4 } from 'uuid';
import { SystemEvent, TriggerType } from '../../types/automation';
import { evaluateWorkflows } from '../automation/workflowEngine';

class EventBus {
  private static instance: EventBus;
  private isProcessing = false;
  private queue: SystemEvent[] = [];

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Emits a system event and triggers the workflow engine
   */
  public async emit(
    eventType: TriggerType,
    entityType: string,
    entityId: string,
    organizationId: string,
    payload: Record<string, any>,
    actorId?: string
  ): Promise<string> {
    const eventId = uuidv4();
    
    // Create the standardized SystemEvent
    const event: SystemEvent = {
      id: eventId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      organization_id: organizationId,
      actor_id: actorId,
      payload,
      processed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Push to processing queue
    this.queue.push(event);

    // If we're already processing, let the loop handle it
    // This prevents concurrency race conditions and infinite stack depth
    if (!this.isProcessing) {
      this.processQueue();
    }

    return eventId;
  }

  /**
   * Process the queue asynchronously
   */
  private async processQueue() {
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (!event) continue;
      
      try {
        // Trigger the workflow evaluation engine
        await evaluateWorkflows(event);
        
        // Mark processed
        event.processed = true;
      } catch (err) {
        console.error(`[EventBus] Error processing event ${event.id}:`, err);
        // Error handling for the event bus itself
      }
    }
    
    this.isProcessing = false;
  }
}

export const eventBus = EventBus.getInstance();
