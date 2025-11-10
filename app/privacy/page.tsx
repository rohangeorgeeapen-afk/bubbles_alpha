import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#ececec]">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] bg-[#212121]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="Bubbles Logo" width={32} height={32} />
            <span className="text-xl font-bold">bubbles</span>
          </Link>
          <Link 
            href="/" 
            className="text-[#b4b4b4] hover:text-[#ececec] transition-colors text-sm"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-[#8e8e8e] mb-8">Last Updated: November 10, 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p className="text-[#b4b4b4] leading-relaxed">
              Welcome to Bubbles (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our graph-based AI conversation interface application.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">1. Account Information</h3>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              When you create an account with Bubbles, we collect:
            </p>
            <ul className="list-disc list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><strong className="text-[#ececec]">Email address</strong> - Used for account creation, authentication, and account recovery</li>
              <li><strong className="text-[#ececec]">Password</strong> - Stored securely using industry-standard encryption (we never store plain-text passwords)</li>
              <li><strong className="text-[#ececec]">User ID</strong> - A unique identifier automatically generated when you create an account</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2. Authentication Data</h3>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              When you sign in with Google OAuth:
            </p>
            <ul className="list-disc list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><strong className="text-[#ececec]">Google account email</strong> - Used to identify and authenticate your account</li>
              <li><strong className="text-[#ececec]">Google profile information</strong> - Basic profile data provided by Google during the OAuth flow</li>
              <li><strong className="text-[#ececec]">Authentication tokens</strong> - Temporary tokens used to maintain your session securely</li>
            </ul>
            <p className="text-[#b4b4b4] leading-relaxed mt-3">
              We do not access or store your Google password.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">3. Conversation Data</h3>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              When you use Bubbles, we store:
            </p>
            <ul className="list-disc list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><strong className="text-[#ececec]">Conversation canvases</strong> - Your saved conversation graphs, including:
                <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                  <li>Canvas names</li>
                  <li>Creation and modification timestamps</li>
                  <li>Node data (your questions and AI responses)</li>
                  <li>Edge data (connections between conversation nodes)</li>
                  <li>Node positions and layout information</li>
                </ul>
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4. Usage Data</h3>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              We automatically collect:
            </p>
            <ul className="list-disc list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><strong className="text-[#ececec]">Session information</strong> - Authentication session data to keep you logged in</li>
              <li><strong className="text-[#ececec]">Local storage data</strong> - Preferences stored in your browser (e.g., mobile warning dismissal)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">5. Technical Data</h3>
            <ul className="list-disc list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><strong className="text-[#ececec]">Browser information</strong> - User agent string to detect mobile devices and optimize the experience</li>
              <li><strong className="text-[#ececec]">Viewport dimensions</strong> - Screen size information for responsive layout</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              We use the collected information for the following purposes:
            </p>
            <ol className="list-decimal list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><strong className="text-[#ececec]">Account Management</strong> - To create, maintain, and secure your account</li>
              <li><strong className="text-[#ececec]">Service Delivery</strong> - To provide the core functionality of Bubbles, including:
                <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                  <li>Saving and retrieving your conversation canvases</li>
                  <li>Maintaining conversation history and context</li>
                  <li>Synchronizing your data across devices</li>
                </ul>
              </li>
              <li><strong className="text-[#ececec]">Authentication</strong> - To verify your identity and maintain secure sessions</li>
              <li><strong className="text-[#ececec]">AI Interactions</strong> - To send your questions to the Gemini AI service and receive responses</li>
              <li><strong className="text-[#ececec]">User Experience</strong> - To optimize the interface based on your device type</li>
            </ol>
          </section>

          {/* AI Service Integration */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">AI Service Integration</h2>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              Bubbles integrates with the Google Gemini API to generate responses to your questions.
            </p>
            <p className="text-[#b4b4b4] leading-relaxed mt-4 mb-3">
              When you ask a question:
            </p>
            <ul className="list-disc list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li>Your conversation history (questions and responses) is sent to the Gemini AI service to maintain context</li>
              <li>The AI service processes your request and returns a response</li>
              <li>We do not control how Google processes your data</li>
            </ul>
            <p className="text-[#b4b4b4] leading-relaxed mt-4">
              Please review Google&apos;s privacy policy:
            </p>
            <ul className="list-disc list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#00D5FF] hover:underline">Google AI Privacy Policy</a></li>
            </ul>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Storage and Security</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Storage Location</h3>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              Your data is stored using Supabase, a secure cloud database platform:
            </p>
            <ul className="list-disc list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><strong className="text-[#ececec]">Authentication data</strong> - Managed by Supabase Auth with industry-standard security</li>
              <li><strong className="text-[#ececec]">Conversation data</strong> - Stored in encrypted PostgreSQL databases</li>
              <li><strong className="text-[#ececec]">Session data</strong> - Stored securely with automatic expiration</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Security Measures</h3>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              We implement the following security measures:
            </p>
            <ol className="list-decimal list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><strong className="text-[#ececec]">Encryption</strong> - All data transmitted between your device and our servers uses HTTPS/TLS encryption</li>
              <li><strong className="text-[#ececec]">Password Security</strong> - Passwords are hashed using bcrypt before storage</li>
              <li><strong className="text-[#ececec]">Row-Level Security</strong> - Database policies ensure you can only access your own data</li>
              <li><strong className="text-[#ececec]">Session Management</strong> - Automatic session refresh and secure token handling</li>
              <li><strong className="text-[#ececec]">OAuth Security</strong> - PKCE flow for enhanced OAuth security</li>
            </ol>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
            <ul className="list-disc list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><strong className="text-[#ececec]">Active accounts</strong> - Your data is retained as long as your account is active</li>
              <li><strong className="text-[#ececec]">Deleted accounts</strong> - When you delete your account, all associated data is permanently deleted from our databases</li>
              <li><strong className="text-[#ececec]">Session data</strong> - Authentication sessions expire automatically and are cleared regularly</li>
            </ul>
          </section>

          {/* Your Rights and Choices */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Your Rights and Choices</h2>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              You have the following rights regarding your data:
            </p>
            <ol className="list-decimal list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><strong className="text-[#ececec]">Access</strong> - You can view all your conversation canvases within the application</li>
              <li><strong className="text-[#ececec]">Modification</strong> - You can edit canvas names and delete individual conversations or entire canvases</li>
              <li><strong className="text-[#ececec]">Deletion</strong> - You can delete your conversations and canvases at any time</li>
              <li><strong className="text-[#ececec]">Account Deletion</strong> - You can request account deletion by contacting us (see Contact Information below)</li>
              <li><strong className="text-[#ececec]">Data Export</strong> - You can request a copy of your data by contacting us</li>
            </ol>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              Bubbles integrates with the following third-party services:
            </p>
            <ol className="list-decimal list-inside text-[#b4b4b4] space-y-3 ml-4">
              <li><strong className="text-[#ececec]">Supabase</strong> - Database and authentication infrastructure
                <br /><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#00D5FF] hover:underline text-sm">Supabase Privacy Policy</a>
              </li>
              <li><strong className="text-[#ececec]">Google OAuth</strong> - Authentication service
                <br /><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#00D5FF] hover:underline text-sm">Google Privacy Policy</a>
              </li>
              <li><strong className="text-[#ececec]">Google Gemini API</strong> - AI response generation
                <br /><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#00D5FF] hover:underline text-sm">Google AI Privacy Policy</a>
              </li>
            </ol>
          </section>

          {/* Cookies and Local Storage */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Cookies and Local Storage</h2>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              Bubbles uses browser storage mechanisms:
            </p>
            <ul className="list-disc list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li><strong className="text-[#ececec]">Cookies</strong> - Session cookies for authentication (automatically deleted when you sign out)</li>
              <li><strong className="text-[#ececec]">Local Storage</strong> - Used to store:
                <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                  <li>Authentication tokens</li>
                  <li>User preferences (e.g., mobile warning dismissal)</li>
                  <li>Session state</li>
                </ul>
              </li>
            </ul>
            <p className="text-[#b4b4b4] leading-relaxed mt-3">
              You can clear this data through your browser settings, but this will sign you out.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
            <p className="text-[#b4b4b4] leading-relaxed">
              Bubbles is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact us at:
            </p>
            <p className="text-[#b4b4b4] leading-relaxed">
              <strong className="text-[#ececec]">Email:</strong>{' '}
              <a href="mailto:rohan@chynex.com" className="text-[#00D5FF] hover:underline">rohan@chynex.com</a>
            </p>
            <p className="text-[#b4b4b4] leading-relaxed mt-2">
              <strong className="text-[#ececec]">Response Time:</strong>{' '}
              We aim to respond to all inquiries within 48 hours.
            </p>
          </section>

          {/* Changes to This Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to This Privacy Policy</h2>
            <p className="text-[#b4b4b4] leading-relaxed mb-3">
              We may update this Privacy Policy from time to time. When we make changes:
            </p>
            <ul className="list-disc list-inside text-[#b4b4b4] space-y-2 ml-4">
              <li>We will update the "Last Updated" date at the top of this policy</li>
              <li>For material changes, we will notify you via email or through a notice in the application</li>
              <li>Your continued use of Bubbles after changes constitutes acceptance of the updated policy</li>
            </ul>
          </section>

          {/* Consent */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Consent</h2>
            <p className="text-[#b4b4b4] leading-relaxed">
              By using Bubbles, you consent to this Privacy Policy and agree to its terms.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-center text-[#8e8e8e] text-sm">
          <p>© 2025 Bubbles. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
