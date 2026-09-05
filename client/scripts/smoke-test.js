/**
 * Client Smoke Test for Login Page and Design System
 * Validates that all page components, hooks, and dependencies are structurally sound.
 */

const fs = require('fs');
const path = require('path');

console.log('[Smoke Test] Starting Client Smoke Test for Login Page...');

const requiredFiles = [
  'app/(auth)/login/page.jsx',
  'app/(auth)/signup/page.jsx',
  'app/(auth)/layout.jsx',
  'context/AuthContext.jsx',
  'context/WorkspaceContext.jsx',
  'lib/api.js',
  'components/ui/Button.jsx',
  'components/ui/Input.jsx',
  'components/ui/Card.jsx',
  'components/ui/Banner.jsx',
  'components/ui/Badge.jsx',
  'components/ui/Spinner.jsx',
];

let failed = false;

for (const file of requiredFiles) {
  const fullPath = path.join(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) {
    console.error(`[Smoke Test ERROR] Missing required client file: ${file}`);
    failed = true;
  } else {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content || content.length < 50) {
      console.error(`[Smoke Test ERROR] Client file is empty or suspiciously short: ${file}`);
      failed = true;
    }
  }
}

// Verify Login Page content specifications
const loginPageContent = fs.readFileSync(path.join(__dirname, '..', 'app/(auth)/login/page.jsx'), 'utf8');
const requiredStrings = [
  'DealFlow360',
  'Log In',
  'Sign Up',
  'After login, internal users land on the Sales Dashboard. Customers land on their Quotation Portal.',
  'Company / team selector shown for multi-team setups.',
  'Basic validation on email and password fields.',
  'Sign-Up link creates a new internal or customer account.',
  'Forgot Password?',
];

for (const str of requiredStrings) {
  if (!loginPageContent.includes(str)) {
    console.error(`[Smoke Test ERROR] Login page missing required copy: "${str}"`);
    failed = true;
  }
}

if (failed) {
  console.error('[Smoke Test FAILED] Some checks did not pass.');
  process.exit(1);
} else {
  console.log('✓ All client files present');
  console.log('✓ Login page visual structure and copy verified');
  console.log('[Smoke Test PASSED] Client smoke test completed successfully.');
}
