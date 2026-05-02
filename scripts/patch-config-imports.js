/**
 * This script patches all remaining files that use the broken
 * Constants.expoConfig?.extra pattern with emulator-only fallbacks.
 * 
 * Run with: node scripts/patch-config-imports.js
 */
const fs = require('fs');
const path = require('path');

// Files that still need patching (from grep results)
const filesToPatch = [
  // Components
  'components/AppointmentChat.tsx',
  'components/PatientDietPlanViewer.tsx',
  'components/DietPlanModal.tsx',
  'components/CustomDrawerLayout.tsx',
  'components/BottomTabBar.tsx',
  // Contexts
  'contexts/GlobalCallContext.tsx',
  'contexts/NewsContext.tsx',
  'contexts/NotificationContext.tsx',
  // App screens
  'app/(main)/_layout.tsx',
  'app/(main)/profile.tsx',
  'app/(main)/(settings)/premium.tsx',
  'app/(main)/(settings)/profile-information.tsx',
  'app/(main)/(settings)/payment-methods.tsx',
  'app/(main)/(settings)/edit-profile-picture.tsx',
  'app/(main)/(settings)/change-password.tsx',
  'app/(main)/(exercises)/workout.tsx',
  'app/(main)/(dashboard)/DetailsDay.tsx',
  'app/(main)/(conference)/appointment-summary.tsx',
  'app/(main)/(conference)/all-user-chats.tsx',
  'app/(main)/(doctor-portal)/all-chats.tsx',
];

// Common patterns to replace
const replacements = [
  // Pattern 1: Top-level ENV + BACKEND_URL with .replace
  {
    find: /const ENV = Constants\.expoConfig\?\.(extra);?\s*\n\s*const (?:BACKEND_URL|API_URL) = \(ENV\?\.\w+.*?10\.0\.2\.2.*?\)\.replace\(.*?\);/gs,
    importNeeded: 'getBackendBaseUrl',
    getReplace: (match) => {
      const varName = match.includes('BACKEND_URL') ? 'BACKEND_URL' : 'API_URL';
      return `const ${varName} = getBackendBaseUrl();`;
    }
  },
  // Pattern 2: Inside function: const ENV = ... ; const API_URL = ...
  {
    find: /const ENV = Constants\.expoConfig\?\.(extra);?\s*\n\s*const API_URL = \(ENV\?\.\w+.*?10\.0\.2\.2.*?\)\.replace\(.*?\);/gs,
    importNeeded: 'getBackendBaseUrl',
    getReplace: () => `const API_URL = getBackendBaseUrl();`
  },
  // Pattern 3: Inline in functions (const API_URL = (ENV?. ... ).replace)
  {
    find: /const (?:API_URL|BACKEND_URL|baseUrl|apiUrl) = \((?:ENV|Constants\.expoConfig\?\.\w+)\?\.\w+.*?10\.0\.2\.2.*?\)(?:\.replace\(.*?\))?;/g,
    importNeeded: 'getBackendBaseUrl',
    getReplace: (match) => {
      if (match.includes('baseUrl')) return `const baseUrl = getBackendBaseUrl();`;
      if (match.includes('apiUrl')) return `const apiUrl = getBackendBaseUrl();`;
      if (match.includes('BACKEND_URL')) return `const BACKEND_URL = getBackendBaseUrl();`;
      return `const API_URL = getBackendBaseUrl();`;
    }
  },
  // Pattern 4: const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  {
    find: /const (?:ENV|envUrl|apiUrl|baseUrl).*Constants\.expoConfig.*\n.*const defaultHost.*10\.0\.2\.2.*\n.*return.*defaultHost.*/g,
    importNeeded: 'getBackendBaseUrl',
    getReplace: () => `return getBackendBaseUrl();`
  }
];

let patchCount = 0;

for (const relPath of filesToPatch) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${relPath}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;
  
  // Check if file already uses config helper
  if (content.includes("from '@/utils/config'") || content.includes("from '../config'") || content.includes("from './config'")) {
    console.log(`SKIP (already patched): ${relPath}`);
    continue;
  }

  let needsImport = new Set();

  // Apply simple text replacements for the most common patterns
  
  // Replace top-level BACKEND_URL pattern
  const backendUrlPattern = /const BACKEND_URL = \(ENV\?\.\w+.*?10\.0\.2\.2.*?\)\.replace\([^)]+\);/;
  if (backendUrlPattern.test(content)) {
    content = content.replace(backendUrlPattern, 'const BACKEND_URL = getBackendBaseUrl();');
    needsImport.add('getBackendBaseUrl');
  }

  // Replace top-level API_URL pattern (with ENV)
  const apiUrlPatternEnv = /const API_URL = \(ENV\?\.\w+.*?10\.0\.2\.2.*?\)\.replace\([^)]+\);/g;
  if (apiUrlPatternEnv.test(content)) {
    content = content.replace(apiUrlPatternEnv, 'const API_URL = getBackendBaseUrl();');
    needsImport.add('getBackendBaseUrl');
  }

  // Replace inline API_URL pattern (with Constants.expoConfig directly)
  const apiUrlPatternDirect = /const API_URL = \(Constants\.expoConfig\?\.extra\?\.\w+.*?10\.0\.2\.2.*?\)\.replace\([^)]+\);/g;
  if (apiUrlPatternDirect.test(content)) {
    content = content.replace(apiUrlPatternDirect, 'const API_URL = getBackendBaseUrl();');
    needsImport.add('getBackendBaseUrl');
  }

  // Replace getBaseURL/getAPIURL function pattern  
  const getBaseUrlFnPattern = /const (?:apiUrl|baseUrl) = ENV\?\.\w+.*?10\.0\.2\.2.*?;/;
  if (getBaseUrlFnPattern.test(content)) {
    content = content.replace(getBaseUrlFnPattern, 'const apiUrl = getBackendBaseUrl();');
    needsImport.add('getBackendBaseUrl');
  }

  // Replace defaultHost pattern
  const defaultHostPattern = /const defaultHost = Platform\.OS === 'android' \? '10\.0\.2\.2' : 'localhost';\s*\n\s*return `http:\/\/\$\{defaultHost\}:\d+(?:\/api)?`;/g;
  if (defaultHostPattern.test(content)) {
    content = content.replace(defaultHostPattern, 'return getBackendBaseUrl();');
    needsImport.add('getBackendBaseUrl');
  }

  // Replace baseUrl pattern in DetailsDay etc
  const baseUrlPattern = /const baseUrl = ENV\?\.\w+.*?10\.0\.2\.2.*?;/;
  if (baseUrlPattern.test(content)) {
    content = content.replace(baseUrlPattern, 'const baseUrl = getBackendBaseUrl();');
    needsImport.add('getBackendBaseUrl');
  }

  // Add import if needed
  if (needsImport.size > 0 && !content.includes("from '@/utils/config'")) {
    const imports = Array.from(needsImport).join(', ');
    const importLine = `import { ${imports} } from '@/utils/config';\n`;
    
    // Add after last import
    const lastImportIdx = content.lastIndexOf('\nimport ');
    if (lastImportIdx !== -1) {
      const endOfImport = content.indexOf('\n', lastImportIdx + 1);
      content = content.slice(0, endOfImport + 1) + importLine + content.slice(endOfImport + 1);
    } else {
      content = importLine + content;
    }
  }

  // Remove unused Constants import if no longer needed
  if (needsImport.size > 0) {
    // Only remove if Constants is not used anywhere else
    const withoutImportLine = content.replace(/import Constants from 'expo-constants';\r?\n/, '');
    if (!withoutImportLine.includes('Constants.') && !withoutImportLine.includes('Constants,')) {
      content = withoutImportLine;
    }
  }

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    patchCount++;
    console.log(`PATCHED: ${relPath}`);
  } else {
    console.log(`NO CHANGE: ${relPath}`);
  }
}

console.log(`\nDone! Patched ${patchCount} files.`);
