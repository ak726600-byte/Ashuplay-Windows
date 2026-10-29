# Ashu Play (Windows)

Electron app. PC par chalane ke liye: `npm install` phir `npm start`.
Installer banane ke liye: `npm run dist` (ya GitHub Actions, neeche dekho).

## Phone se build karna
1. GitHub account banao, naya repo banao (Public ya Private).
2. Is folder ki saari files repo me upload karo (hidden folder `.github` bhi).
3. Repo me Actions tab -> "Build Windows app" -> Run workflow.
4. 5-8 minute baad run khulega -> neeche Artifacts me `AshuPlay-windows` download karo.
5. Zip me `AshuPlay-1.0.0-nsis.exe` (installer) aur `AshuPlay-1.0.0-portable.exe` milega.
