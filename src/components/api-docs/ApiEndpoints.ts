export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
}

export interface ApiEndpoint {
  id: string;
  category: string;
  title: string;
  description: string;
  method: HttpMethod;
  path: string;
  parameters?: ApiParameter[];
  bodyParams?: ApiParameter[];
  sampleRequest?: string;
  sampleResponse?: string;
}

export const ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'auth-intro',
    category: 'Authentication',
    title: 'Authenticate requests',
    description: 'The Edvix API uses API keys to authenticate requests. You can view and manage your API keys in the Developer Settings of your CRM dashboard. All API requests must be made over HTTPS. Calls made over plain HTTP will fail. API requests without authentication will also fail. Provide your API key in the Authorization header.',
    method: 'GET',
    path: '/(any endpoint)',
    sampleRequest: `curl https://your-project.supabase.co/rest/v1/leads \\
  -H "Authorization: Bearer edvix_live_..." \\
  -H "apikey: edvix_live_..."`,
    sampleResponse: `// Example 401 Unauthorized Response
{
  "code": 401,
  "message": "Invalid API key"
}`
  },
  {
    id: 'create-lead',
    category: 'Leads',
    title: 'Create a lead',
    description: 'Creates a new lead object. This is typically used when a prospective student fills out a form on your website.',
    method: 'POST',
    path: '/rest/v1/leads',
    bodyParams: [
      { name: 'first_name', type: 'string', required: true, description: "The student's first name" },
      { name: 'last_name', type: 'string', required: true, description: "The student's last name" },
      { name: 'email', type: 'string', required: true, description: "The student's email address" },
      { name: 'phone', type: 'string', required: false, description: "The student's phone number" },
      { name: 'source', type: 'string', required: true, description: 'Where the lead originated (e.g. "Website", "Referral")' }
    ],
    sampleRequest: `curl -X POST https://your-project.supabase.co/rest/v1/leads \\
  -H "Authorization: Bearer edvix_live_..." \\
  -H "apikey: edvix_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "source": "Website API"
  }'`,
    sampleResponse: `{
  "id": "e9b7b9f3-...",
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "status": "New",
  "created_at": "2023-10-15T10:30:00Z"
}`
  },
  {
    id: 'list-leads',
    category: 'Leads',
    title: 'List all leads',
    description: 'Returns a list of your leads. The leads are returned sorted by creation date, with the most recently created leads appearing first.',
    method: 'GET',
    path: '/rest/v1/leads',
    parameters: [
      { name: 'select', type: 'string', required: false, description: 'Columns to return, e.g. "*"' },
      { name: 'limit', type: 'integer', required: false, description: 'A limit on the number of objects to be returned.' },
    ],
    sampleRequest: `curl -G https://your-project.supabase.co/rest/v1/leads \\
  -H "Authorization: Bearer edvix_live_..." \\
  -H "apikey: edvix_live_..." \\
  -d "select=*" \\
  -d "limit=10"`,
    sampleResponse: `[
  {
    "id": "e9b7b9f3-...",
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "status": "New"
  }
]`
  },
  {
    id: 'retrieve-lead',
    category: 'Leads',
    title: 'Retrieve a lead',
    description: 'Retrieves the details of an existing lead. You need only supply the unique lead identifier that was returned upon lead creation.',
    method: 'GET',
    path: '/rest/v1/leads?id=eq.{id}',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'The UUID of the lead to retrieve.' }
    ],
    sampleRequest: `curl https://your-project.supabase.co/rest/v1/leads?id=eq.e9b7b9f3-... \\
  -H "Authorization: Bearer edvix_live_..." \\
  -H "apikey: edvix_live_..."`,
    sampleResponse: `[
  {
    "id": "e9b7b9f3-...",
    "first_name": "Jane",
    "status": "Contacted"
  }
]`
  },
  {
    id: 'update-lead',
    category: 'Leads',
    title: 'Update a lead',
    description: 'Updates the specified lead by setting the values of the parameters passed. Any parameters not provided will be left unchanged.',
    method: 'PATCH',
    path: '/rest/v1/leads?id=eq.{id}',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'The UUID of the lead to update.' }
    ],
    bodyParams: [
      { name: 'status', type: 'string', required: false, description: 'The new status of the lead' },
      { name: 'assigned_to', type: 'string', required: false, description: 'The UUID of the user to assign the lead to' }
    ],
    sampleRequest: `curl -X PATCH https://your-project.supabase.co/rest/v1/leads?id=eq.e9b7b9f3-... \\
  -H "Authorization: Bearer edvix_live_..." \\
  -H "apikey: edvix_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "Qualified"
  }'`,
    sampleResponse: ``
  },
  {
    id: 'create-admission',
    category: 'Admissions',
    title: 'Create an admission',
    description: 'Creates an admission record linking a student to a university and course.',
    method: 'POST',
    path: '/rest/v1/admissions',
    bodyParams: [
      { name: 'lead_id', type: 'string', required: true, description: 'The UUID of the prospective student (lead)' },
      { name: 'university_id', type: 'string', required: true, description: 'The UUID of the university' },
      { name: 'course_id', type: 'string', required: true, description: 'The UUID of the course' }
    ],
    sampleRequest: `curl -X POST https://your-project.supabase.co/rest/v1/admissions \\
  -H "Authorization: Bearer edvix_live_..." \\
  -H "apikey: edvix_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "lead_id": "e9b7b9f3-...",
    "university_id": "d1c2...",
    "course_id": "c5a4..."
  }'`,
    sampleResponse: `{
  "id": "a1b2...",
  "status": "Application Submitted"
}`
  },
  {
    id: 'retrieve-admission',
    category: 'Admissions',
    title: 'Retrieve an admission',
    description: 'Retrieves the details of a specific admission application.',
    method: 'GET',
    path: '/rest/v1/admissions?id=eq.{id}',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'The UUID of the admission.' }
    ],
    sampleRequest: `curl https://your-project.supabase.co/rest/v1/admissions?id=eq.a1b2... \\
  -H "Authorization: Bearer edvix_live_..." \\
  -H "apikey: edvix_live_..."`,
    sampleResponse: `[
  {
    "id": "a1b2...",
    "status": "Offer Received",
    "university_id": "d1c2..."
  }
]`
  },
  {
    id: 'list-universities',
    category: 'Master Data',
    title: 'List universities',
    description: 'Returns a list of active universities configured in the CRM.',
    method: 'GET',
    path: '/rest/v1/universities',
    sampleRequest: `curl https://your-project.supabase.co/rest/v1/universities?select=id,name,country,status \\
  -H "Authorization: Bearer edvix_live_..." \\
  -H "apikey: edvix_live_..."`,
    sampleResponse: `[
  {
    "id": "d1c2...",
    "name": "Harvard University",
    "country": "United States",
    "status": "Active"
  }
]`
  },
  {
    id: 'list-courses',
    category: 'Master Data',
    title: 'List courses',
    description: 'Returns a list of active courses. You can filter by university_id to get courses for a specific institution.',
    method: 'GET',
    path: '/rest/v1/courses',
    parameters: [
      { name: 'university_id', type: 'string', required: false, description: 'Filter by university UUID' }
    ],
    sampleRequest: `curl https://your-project.supabase.co/rest/v1/courses?university_id=eq.d1c2... \\
  -H "Authorization: Bearer edvix_live_..." \\
  -H "apikey: edvix_live_..."`,
    sampleResponse: `[
  {
    "id": "c5a4...",
    "name": "MSc Computer Science",
    "level": "Postgraduate",
    "tuition_fee": 45000
  }
]`
  },
  {
    id: 'list-payments',
    category: 'Payments',
    title: 'List payments',
    description: 'Returns a list of payments recorded in the system. Often used by Finance APIs to sync general ledger.',
    method: 'GET',
    path: '/rest/v1/payments',
    parameters: [
      { name: 'status', type: 'string', required: false, description: 'Filter by payment status (e.g. Paid, Pending)' }
    ],
    sampleRequest: `curl https://your-project.supabase.co/rest/v1/payments?status=eq.Paid \\
  -H "Authorization: Bearer edvix_live_..." \\
  -H "apikey: edvix_live_..."`,
    sampleResponse: `[
  {
    "id": "p9x8...",
    "amount": 2500,
    "currency": "USD",
    "status": "Paid",
    "payment_date": "2023-11-01T00:00:00Z"
  }
]`
  },
  {
    id: 'create-webhook',
    category: 'Webhooks',
    title: 'Create a webhook',
    description: 'Programmatically registers a new webhook endpoint to receive real-time notifications about CRM events (e.g., admission.confirmed, lead.created).',
    method: 'POST',
    path: '/rest/v1/webhooks',
    bodyParams: [
      { name: 'name', type: 'string', required: true, description: 'A label for the webhook' },
      { name: 'url', type: 'string', required: true, description: 'The HTTPS URL that will receive the payloads' },
      { name: 'events', type: 'array', required: true, description: 'An array of event strings to subscribe to (e.g. ["lead.created"])' }
    ],
    sampleRequest: `curl -X POST https://your-project.supabase.co/rest/v1/webhooks \\
  -H "Authorization: Bearer edvix_live_..." \\
  -H "apikey: edvix_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Partner CRM Sync",
    "url": "https://partner.com/webhooks/edvix",
    "events": ["admission.confirmed"]
  }'`,
    sampleResponse: `{
  "id": "w1q2...",
  "status": "Active"
}`
  }
];
