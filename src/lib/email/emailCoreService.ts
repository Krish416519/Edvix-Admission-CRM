export const emailCoreService = {
  sendEmail: async (options: any) => {
    console.log('Sending email:', options);
  },
  renderTemplate: (template: string, vars: any) => {
    return template;
  }
};
