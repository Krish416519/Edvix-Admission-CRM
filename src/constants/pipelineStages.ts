export const DEFAULT_PIPELINE_STAGES = [
  'Inquiry', 'Not Connected', 'Cold', 'Warm', 'Hot', 'Qualified',
  'Application', 'Docs Pending', 'Admitted', 'Rejected'
];

export const STATUS_COLORS: Record<string, string> = {
  'Inquiry': 'bg-violet-100 text-violet-700',
  'Not Connected': 'bg-sky-100 text-sky-700',
  'Cold': 'bg-slate-100 text-slate-600',
  'Warm': 'bg-yellow-100 text-yellow-700',
  'Hot': 'bg-orange-100 text-orange-700',
  'Qualified': 'bg-teal-100 text-teal-700',
  'Application': 'bg-indigo-100 text-indigo-700',
  'Docs Pending': 'bg-amber-100 text-amber-700',
  'Admitted': 'bg-emerald-100 text-emerald-700',
  'Rejected': 'bg-red-100 text-red-700',
};
