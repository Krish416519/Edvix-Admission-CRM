export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  context_data: any;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'model' | 'system' | 'function';
  content: string;
  tool_calls?: any;
  created_at: string;
}

export interface AIAuditLog {
  id: string;
  user_id: string;
  prompt: string;
  response: string;
  execution_time_ms: number;
  tools_used: string[];
  created_at: string;
}

export interface MCPToolContext {
  userId: string;
  userRole: string;
}
