# Privacy Policy for Bubbles

**Last Updated:** November 10, 2025

## Introduction

Welcome to Bubbles ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our graph-based AI conversation interface application.

## Information We Collect

### 1. Account Information

When you create an account with Bubbles, we collect:

- **Email address** - Used for account creation, authentication, and account recovery
- **Password** - Stored securely using industry-standard encryption (we never store plain-text passwords)
- **User ID** - A unique identifier automatically generated when you create an account

### 2. Authentication Data

When you sign in with Google OAuth:

- **Google account email** - Used to identify and authenticate your account
- **Google profile information** - Basic profile data provided by Google during the OAuth flow
- **Authentication tokens** - Temporary tokens used to maintain your session securely

We do not access or store your Google password.

### 3. Conversation Data

When you use Bubbles, we store:

- **Conversation canvases** - Your saved conversation graphs, including:
  - Canvas names
  - Creation and modification timestamps
  - Node data (your questions and AI responses)
  - Edge data (connections between conversation nodes)
  - Node positions and layout information

### 4. Usage Data

We automatically collect:

- **Session information** - Authentication session data to keep you logged in
- **Local storage data** - Preferences stored in your browser (e.g., mobile warning dismissal)

### 5. Technical Data

- **Browser information** - User agent string to detect mobile devices and optimize the experience
- **Viewport dimensions** - Screen size information for responsive layout

## How We Use Your Information

We use the collected information for the following purposes:

1. **Account Management** - To create, maintain, and secure your account
2. **Service Delivery** - To provide the core functionality of Bubbles, including:
   - Saving and retrieving your conversation canvases
   - Maintaining conversation history and context
   - Synchronizing your data across devices
3. **Authentication** - To verify your identity and maintain secure sessions
4. **AI Interactions** - To send your questions to the Gemini AI service and receive responses
5. **User Experience** - To optimize the interface based on your device type

## AI Service Integration

Bubbles integrates with the Google Gemini API to generate responses to your questions.

When you ask a question:
- Your conversation history (questions and responses) is sent to the Gemini AI service to maintain context
- The AI service processes your request and returns a response
- We do not control how Google processes your data

Please review Google's privacy policy:
- [Google AI Privacy Policy](https://policies.google.com/privacy)

## Data Storage and Security

### Storage Location

Your data is stored using Supabase, a secure cloud database platform:

- **Authentication data** - Managed by Supabase Auth with industry-standard security
- **Conversation data** - Stored in encrypted PostgreSQL databases
- **Session data** - Stored securely with automatic expiration

### Security Measures

We implement the following security measures:

1. **Encryption** - All data transmitted between your device and our servers uses HTTPS/TLS encryption
2. **Password Security** - Passwords are hashed using bcrypt before storage
3. **Row-Level Security** - Database policies ensure you can only access your own data
4. **Session Management** - Automatic session refresh and secure token handling
5. **OAuth Security** - PKCE flow for enhanced OAuth security

## Data Retention

- **Active accounts** - Your data is retained as long as your account is active
- **Deleted accounts** - When you delete your account, all associated data is permanently deleted from our databases
- **Session data** - Authentication sessions expire automatically and are cleared regularly

## Your Rights and Choices

You have the following rights regarding your data:

1. **Access** - You can view all your conversation canvases within the application
2. **Modification** - You can edit canvas names and delete individual conversations or entire canvases
3. **Deletion** - You can delete your conversations and canvases at any time
4. **Account Deletion** - You can request account deletion by contacting us (see Contact Information below)
5. **Data Export** - You can request a copy of your data by contacting us

## Third-Party Services

Bubbles integrates with the following third-party services:

1. **Supabase** - Database and authentication infrastructure
   - [Supabase Privacy Policy](https://supabase.com/privacy)

2. **Google OAuth** - Authentication service
   - [Google Privacy Policy](https://policies.google.com/privacy)

3. **Google Gemini API** - AI response generation
   - [Google AI Privacy Policy](https://policies.google.com/privacy)

## Cookies and Local Storage

Bubbles uses browser storage mechanisms:

- **Cookies** - Session cookies for authentication (automatically deleted when you sign out)
- **Local Storage** - Used to store:
  - Authentication tokens
  - User preferences (e.g., mobile warning dismissal)
  - Session state

You can clear this data through your browser settings, but this will sign you out.

## Children's Privacy

Bubbles is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.

## International Data Transfers

Your data may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using Bubbles, you consent to the transfer of your information to our servers and third-party service providers.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. When we make changes:

- We will update the "Last Updated" date at the top of this policy
- For material changes, we will notify you via email or through a notice in the application
- Your continued use of Bubbles after changes constitutes acceptance of the updated policy

## Data Breach Notification

In the event of a data breach that affects your personal information, we will:

1. Notify affected users within 72 hours of discovering the breach
2. Provide details about what information was compromised
3. Explain the steps we are taking to address the breach
4. Offer guidance on how to protect yourself

## Contact Information

If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact us at:

**Email:** rohan@chynex.com

**Response Time:** We aim to respond to all inquiries within 48 hours.

## Legal Basis for Processing (GDPR)

For users in the European Economic Area (EEA), our legal basis for processing your personal data includes:

1. **Consent** - You have given clear consent for us to process your personal data for specific purposes
2. **Contract** - Processing is necessary to provide the service you requested
3. **Legitimate Interests** - Processing is necessary for our legitimate interests (e.g., improving our service)

## Your GDPR Rights

If you are in the EEA, you have the following additional rights:

- **Right to Access** - Request copies of your personal data
- **Right to Rectification** - Request correction of inaccurate data
- **Right to Erasure** - Request deletion of your data
- **Right to Restrict Processing** - Request limitation of how we use your data
- **Right to Data Portability** - Request transfer of your data to another service
- **Right to Object** - Object to our processing of your data
- **Rights Related to Automated Decision-Making** - We do not use automated decision-making or profiling

To exercise these rights, please contact us using the information above.

## California Privacy Rights (CCPA)

If you are a California resident, you have the following rights:

1. **Right to Know** - Request information about the personal data we collect and how we use it
2. **Right to Delete** - Request deletion of your personal data
3. **Right to Opt-Out** - Opt-out of the sale of personal data (Note: We do not sell personal data)
4. **Right to Non-Discrimination** - We will not discriminate against you for exercising your privacy rights

To exercise these rights, please contact us using the information above.

## Consent

By using Bubbles, you consent to this Privacy Policy and agree to its terms.

---

**Note:** This privacy policy is designed to be transparent about our data practices. If you have any questions or concerns, please don't hesitate to reach out.
