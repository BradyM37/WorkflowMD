declare module '@sendgrid/mail' {
  export interface MailDataRequired {
    to: string | string[];
    from: { email: string; name?: string } | string;
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
  }

  export class MailService {
    setApiKey(apiKey: string): void;
    send(data: MailDataRequired): Promise<any>;
  }

  const sgMail: MailService;
  export default sgMail;
}
