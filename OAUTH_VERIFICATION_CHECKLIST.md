# Google OAuth Verification Checklist for Bubbles

## Brand Verification Requirements

### ✅ 1. Homepage Requirements
- [x] Homepage hosted on verified domain
- [x] Homepage accurately represents app identity and brand
- [x] Homepage describes app functionality (branching AI conversations)
- [x] Homepage is not just a login page
- [x] Privacy policy link added to homepage footer

### ✅ 2. Privacy Policy
- [x] Privacy Policy hosted on same domain as homepage (`/privacy`)
- [x] Privacy Policy linked on homepage (footer)
- [ ] Privacy Policy linked on OAuth consent screen (add during setup)
- [x] Privacy Policy discloses how we access, use, store Google user data
- [x] Privacy Policy states limited use (authentication only)
- [x] Privacy Policy kept up to date

### 🔲 3. Domain Verification
- [ ] Verify domain ownership in Google Search Console
- [ ] Add verified domain to OAuth consent screen "Authorized domains"

### ✅ 4. Google Branding
- [x] "Continue with Google" button follows Google branding guidelines
- [x] Button initiates OAuth flow correctly

### 🔲 5. OAuth Consent Screen Configuration
- [ ] App name: Bubbles
- [ ] User support email: rohan@chynex.com
- [ ] App logo: Upload logo.png
- [ ] App homepage: https://[your-domain].com
- [ ] Privacy policy URL: https://[your-domain].com/privacy
- [ ] Authorized domains: [your-domain].com
- [ ] Developer contact: rohan@chynex.com
- [ ] Scopes requested: email, profile (or openid)

### ✅ 6. Project Contact Information
- [x] Contact email: rohan@chynex.com
- [x] Contact information up to date

## Scopes Requested

We only request **non-sensitive scopes**:
- `email` - To identify and authenticate users
- `profile` - To get basic profile information (optional)
- `openid` - For OpenID Connect authentication

**Note:** These are non-sensitive scopes, so we do NOT need:
- Security assessment
- App functionality demonstration video
- Sensitive/Restricted scope justification

## Data Usage Declaration

**What we access:**
- User email address
- Basic profile information (name, if available)

**How we use it:**
- Email: User identification and authentication
- Profile: Display user information in app (optional)

**What we DON'T access:**
- Gmail
- Google Drive
- Google Calendar
- Google Photos
- Any other Google services

**Data storage:**
- Email stored in Supabase database
- Used only for account management
- Protected with row-level security
- Users can delete their account anytime

## Additional Information for Google Review

**App Description:**
Bubbles is a graph-based AI conversation interface that allows users to have branching conversations with AI. Users can explore topics naturally by creating conversation branches without losing context.

**OAuth Usage:**
We use Google OAuth solely for user authentication. We only request email and basic profile information to create and identify user accounts.

**Test Instructions:**
1. Visit https://[your-domain].com
2. Click "Get Started" or "Sign Up"
3. Choose "Continue with Google"
4. Grant permissions (email and profile)
5. You'll be authenticated and can create conversation canvases

**Privacy & Security:**
- Privacy Policy: https://[your-domain].com/privacy
- Contact: rohan@chynex.com
- HTTPS/TLS encryption for all data transmission
- Bcrypt password hashing
- Row-level security in database

## Deployment Checklist

Before submitting for verification:
- [ ] App deployed to production
- [ ] Domain verified in Google Search Console
- [ ] OAuth consent screen fully configured
- [ ] Privacy policy accessible at /privacy
- [ ] Test OAuth flow end-to-end
- [ ] Ensure all links work correctly

## Submission Notes

**Verification Type:** Brand Verification (non-sensitive scopes only)

**Timeline:** Brand verification typically takes 1-2 weeks

**Contact:** If Google has questions, they'll contact rohan@chynex.com

---

**Last Updated:** November 11, 2025
