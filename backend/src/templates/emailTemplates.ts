// Email templates for SUT Conference System
export const emailTemplates = {
  // Common email header and footer
  header: `
    <div style="background: linear-gradient(135deg, #1565C0 0%, #42A5F5 100%); padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-family: 'Arial', sans-serif;">
        International Academic Conference 2024
      </h1>
      <p style="color: #E3F2FD; margin: 5px 0 0 0; font-size: 14px;">
        Suranaree University of Technology
      </p>
    </div>
  `,
  
  footer: `
    <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0; color: #666; font-size: 12px;">
        <strong>Contact Information:</strong><br>
        Email: <a href="mailto:anscse29@g.sut.ac.th" style="color: #1565C0;">anscse29@g.sut.ac.th</a><br>
        Suranaree University of Technology<br>
        111 University Avenue, Muang District, Nakhon Ratchasima 30000, Thailand
      </p>
      <p style="margin: 10px 0 0 0; color: #999; font-size: 11px;">
        This is an automated message from the Conference Management System.
      </p>
    </div>
  `,

  // Registration confirmation
  registrationConfirmation: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    participantType: string;
    registrationId: string;
  }) => ({
    subject: 'Registration Confirmation - International Academic Conference 2024',
    html: `
      ${emailTemplates.header}
      <div style="padding: 30px; font-family: 'Arial', sans-serif; line-height: 1.6;">
        <h2 style="color: #1565C0; margin-bottom: 20px;">Registration Confirmed!</h2>
        
        <p>Dear ${userData.firstName} ${userData.lastName},</p>
        
        <p>Thank you for registering for the International Academic Conference 2024. Your registration has been successfully confirmed.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1565C0; margin-top: 0;">Registration Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Registration ID:</strong> ${userData.registrationId}</li>
            <li><strong>Name:</strong> ${userData.firstName} ${userData.lastName}</li>
            <li><strong>Email:</strong> ${userData.email}</li>
            <li><strong>Participant Type:</strong> ${userData.participantType}</li>
          </ul>
        </div>
        
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Complete your payment (if applicable)</li>
          <li>Submit your abstract/manuscript (for presenters)</li>
          <li>Check your email regularly for updates</li>
        </ol>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>
        Conference Organizing Committee<br>
        Suranaree University of Technology</p>
      </div>
      ${emailTemplates.footer}
    `
  }),

  // Submission confirmation
  submissionConfirmation: (submissionData: {
    firstName: string;
    lastName: string;
    title: string;
    submissionId: string;
    sessionType: string;
    presentationType: string;
  }) => ({
    subject: 'Abstract Submission Confirmed - International Academic Conference 2024',
    html: `
      ${emailTemplates.header}
      <div style="padding: 30px; font-family: 'Arial', sans-serif; line-height: 1.6;">
        <h2 style="color: #1565C0; margin-bottom: 20px;">Submission Received!</h2>
        
        <p>Dear ${submissionData.firstName} ${submissionData.lastName},</p>
        
        <p>Your abstract submission has been successfully received and is now under review.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1565C0; margin-top: 0;">Submission Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Submission ID:</strong> ${submissionData.submissionId}</li>
            <li><strong>Title:</strong> ${submissionData.title}</li>
            <li><strong>Session:</strong> ${submissionData.sessionType}</li>
            <li><strong>Presentation Type:</strong> ${submissionData.presentationType}</li>
          </ul>
        </div>
        
        <p><strong>Review Process:</strong></p>
        <ul>
          <li>Your submission will be reviewed by our scientific committee</li>
          <li>You will receive notification of the review outcome by email</li>
          <li>The review process typically takes 2-3 weeks</li>
        </ul>
        
        <p>Thank you for your contribution to the conference.</p>
        
        <p>Best regards,<br>
        Scientific Committee<br>
        Suranaree University of Technology</p>
      </div>
      ${emailTemplates.footer}
    `
  }),

  // Payment confirmation
  paymentConfirmation: (paymentData: {
    firstName: string;
    lastName: string;
    amount: number;
    currency: string;
    transactionId: string;
  }) => ({
    subject: 'Payment Confirmation - International Academic Conference 2024',
    html: `
      ${emailTemplates.header}
      <div style="padding: 30px; font-family: 'Arial', sans-serif; line-height: 1.6;">
        <h2 style="color: #2E7D32; margin-bottom: 20px;">Payment Confirmed!</h2>
        
        <p>Dear ${paymentData.firstName} ${paymentData.lastName},</p>
        
        <p>We have received and verified your payment. Thank you for completing your registration.</p>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2E7D32;">
          <h3 style="color: #2E7D32; margin-top: 0;">Payment Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Amount:</strong> ${paymentData.amount} ${paymentData.currency}</li>
            <li><strong>Transaction ID:</strong> ${paymentData.transactionId}</li>
            <li><strong>Status:</strong> Verified</li>
          </ul>
        </div>
        
        <p>Your registration is now complete. You will receive further information about the conference program closer to the event date.</p>
        
        <p>Best regards,<br>
        Finance Committee<br>
        Suranaree University of Technology</p>
      </div>
      ${emailTemplates.footer}
    `
  }),

  // Review assignment notification
  reviewAssignment: (reviewData: {
    reviewerName: string;
    submissionTitle: string;
    submissionId: string;
    deadline: string;
  }) => ({
    subject: 'Review Assignment - International Academic Conference 2024',
    html: `
      ${emailTemplates.header}
      <div style="padding: 30px; font-family: 'Arial', sans-serif; line-height: 1.6;">
        <h2 style="color: #1565C0; margin-bottom: 20px;">New Review Assignment</h2>
        
        <p>Dear ${reviewData.reviewerName},</p>
        
        <p>You have been assigned a new submission to review for the International Academic Conference 2024.</p>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF6F00;">
          <h3 style="color: #E65100; margin-top: 0;">Review Assignment:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Submission ID:</strong> ${reviewData.submissionId}</li>
            <li><strong>Title:</strong> ${reviewData.submissionTitle}</li>
            <li><strong>Review Deadline:</strong> ${reviewData.deadline}</li>
          </ul>
        </div>
        
        <p>Please log in to the conference system to access the submission and complete your review.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: #1565C0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Access Review System
          </a>
        </div>
        
        <p>Thank you for your valuable contribution to the peer review process.</p>
        
        <p>Best regards,<br>
        Scientific Committee<br>
        Suranaree University of Technology</p>
      </div>
      ${emailTemplates.footer}
    `
  }),

  // Deadline reminder
  deadlineReminder: (reminderData: {
    firstName: string;
    lastName: string;
    deadlineType: string;
    deadline: string;
    daysLeft: number;
  }) => ({
    subject: `Reminder: ${reminderData.deadlineType} Deadline Approaching`,
    html: `
      ${emailTemplates.header}
      <div style="padding: 30px; font-family: 'Arial', sans-serif; line-height: 1.6;">
        <h2 style="color: #F57C00; margin-bottom: 20px;">Deadline Reminder</h2>
        
        <p>Dear ${reminderData.firstName} ${reminderData.lastName},</p>
        
        <p>This is a friendly reminder that the ${reminderData.deadlineType} deadline is approaching.</p>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F57C00;">
          <h3 style="color: #E65100; margin-top: 0;">Important Deadline:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Deadline:</strong> ${reminderData.deadline}</li>
            <li><strong>Days Remaining:</strong> ${reminderData.daysLeft} days</li>
          </ul>
        </div>
        
        <p>Please ensure you complete the required actions before the deadline to avoid any inconvenience.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: #F57C00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Access Conference System
          </a>
        </div>
        
        <p>If you have any questions or need assistance, please contact us immediately.</p>
        
        <p>Best regards,<br>
        Conference Organizing Committee<br>
        Suranaree University of Technology</p>
      </div>
      ${emailTemplates.footer}
    `
  }),

  // Welcome email for new users
  welcome: (userData: {
    firstName: string;
    lastName: string;
    email: string;
  }) => ({
    subject: 'Welcome to International Academic Conference 2024',
    html: `
      ${emailTemplates.header}
      <div style="padding: 30px; font-family: 'Arial', sans-serif; line-height: 1.6;">
        <h2 style="color: #1565C0; margin-bottom: 20px;">Welcome to Our Conference!</h2>
        
        <p>Dear ${userData.firstName} ${userData.lastName},</p>
        
        <p>Welcome to the International Academic Conference 2024 hosted by Suranaree University of Technology!</p>
        
        <p>We are excited to have you join our academic community. This conference brings together researchers, academics, and industry professionals from around the world to share knowledge and collaborate on cutting-edge research.</p>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1565C0; margin-top: 0;">Conference Highlights:</h3>
          <ul>
            <li>Keynote presentations by world-renowned experts</li>
            <li>Technical sessions across multiple disciplines</li>
            <li>Networking opportunities with international researchers</li>
            <li>Publication opportunities in conference proceedings</li>
          </ul>
        </div>
        
        <p><strong>Getting Started:</strong></p>
        <ol>
          <li>Complete your registration profile</li>
          <li>Submit your abstract (if presenting)</li>
          <li>Register for sessions of interest</li>
          <li>Complete payment process</li>
        </ol>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: #1565C0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Access Conference Portal
          </a>
        </div>
        
        <p>We look forward to your participation and contribution to making this conference a great success!</p>
        
        <p>Best regards,<br>
        Conference Organizing Committee<br>
        Suranaree University of Technology</p>
      </div>
      ${emailTemplates.footer}
    `
  })
};

// Email configuration for SUT
export const emailConfig = {
  from: 'anscse29@g.sut.ac.th',
  replyTo: 'anscse29@g.sut.ac.th',
  organization: 'Suranaree University of Technology',
  conference: 'International Academic Conference 2024',
  website: 'https://conference.sut.ac.th', // Update with actual domain
  supportEmail: 'anscse29@g.sut.ac.th'
};