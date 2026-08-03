import { WhatsAppConversation, WhatsAppMessage, WhatsAppTemplate } from '../types/whatsapp';

export const mockWhatsAppTemplates: WhatsAppTemplate[] = [
  {
    id: 'tpl_1',
    name: 'Welcome Message',
    category: 'Welcome',
    content: 'Hi {{name}}, welcome to Edvix! I am your assigned counselor. Let me know if you have any questions about {{course}}.',
    variables: ['name', 'course']
  },
  {
    id: 'tpl_2',
    name: 'Fee Reminder',
    category: 'Fee Reminder',
    content: 'Dear {{name}}, this is a gentle reminder that your fee payment for {{course}} is pending. Please complete it by {{date}}.',
    variables: ['name', 'course', 'date']
  },
  {
    id: 'tpl_3',
    name: 'Document Reminder',
    category: 'Document Reminder',
    content: 'Hi {{name}}, we are still waiting for your {{document}}. Please upload it as soon as possible to proceed with admission.',
    variables: ['name', 'document']
  }
];

export const mockConversations: WhatsAppConversation[] = [
  {
    id: 'conv_1',
    leadId: '1',
    leadName: 'Rahul Sharma',
    leadPhone: '+91 9876543210',
    counselorId: 'c1',
    counselorName: 'Priya Singh',
    unreadCount: 2,
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    lastMessageSnippet: 'Can you share the brochure?',
    isPinned: true
  },
  {
    id: 'conv_2',
    leadId: '2',
    leadName: 'Aarti Patel',
    leadPhone: '+91 9876543211',
    counselorId: 'c1',
    counselorName: 'Priya Singh',
    unreadCount: 0,
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    lastMessageSnippet: 'Thank you for the information.',
    isPinned: false
  }
];

export const mockMessages: WhatsAppMessage[] = [
  {
    id: 'msg_1',
    conversationId: 'conv_1',
    sender: 'Counselor',
    type: 'Template',
    content: 'Hi Rahul Sharma, welcome to Edvix! I am your assigned counselor. Let me know if you have any questions about MBA.',
    status: 'Read',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: 'msg_2',
    conversationId: 'conv_1',
    sender: 'Student',
    type: 'Text',
    content: 'Can you share the brochure?',
    status: 'Delivered',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  },
  {
    id: 'msg_3',
    conversationId: 'conv_2',
    sender: 'Counselor',
    type: 'Text',
    content: 'Please find your fee receipt attached.',
    status: 'Read',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
  },
  {
    id: 'msg_4',
    conversationId: 'conv_2',
    sender: 'Student',
    type: 'Text',
    content: 'Thank you for the information.',
    status: 'Delivered',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  }
];
