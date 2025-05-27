# QuickSend Application: Project Context (as of May 13th)

This document outlines the current state, architecture, and troubleshooting history of the QuickSend application deployment to Google Cloud.

## 1. Project Goal

To deploy the QuickSend application (frontend and backend) to Google Cloud Run, with a CI/CD pipeline triggered by commits to a GitHub repository.

## 2. Application Stack

*   **Frontend:**
    *   Framework: React (Vite)
    *   Build Command: `npm run build` (defined in root `package.json` as `tsc -b && vite build`)
    *   Build Output: `dist` directory
    *   Serving: Nginx (serving static files from `dist`)
    *   Location: Root directory of the project.
*   **Backend:**
    *   Framework: Node.js / Express / TypeScript
    *   Build Command: `npm run build` (defined in `backend/package.json` as `tsc`)
    *   Start Command: `npm start` (defined in `backend/package.json` as `node dist/server.js`)
    *   Listens on: Port 5000
    *   Location: `backend/` directory.
*   **Cloud Services:**
    *   File Storage: Google Cloud Storage
    *   Database: Firestore (database ID: `quicksend-db`)
    *   Authentication: Firebase Authentication (for frontend)
*   **Service Accounts:**
    *   Backend Cloud Run Service Account: `quicksend-backend@fleet-parsec-425911-i7.iam.gserviceaccount.com` (has necessary permissions for Firestore, GCS).
    *   Cloud Build Service Account: `627959729856-compute@developer.gserviceaccount.com` (has `Secret Manager Secret Accessor` role).

## 3. CI/CD Setup

*   **Source Control:** GitHub (assumed, as CI/CD is triggered by commits)
*   **Containerization:** Docker
    *   Frontend: `Dockerfile` located at the project root.
    *   Backend: `backend/Dockerfile`.
    *   Ignore files: `.dockerignore` used for both.
*   **Image Registry:** Google Artifact Registry
    *   Region: `us-central1` (inferred)
    *   Repositories:
        *   `quicksend-frontend`
        *   `quicksend-backend`
*   **Build & Deploy:** Google Cloud Build
    *   Configuration: `cloudbuild.yaml` at the project root.
*   **Deployment Target:** Google Cloud Run
    *   Region: `us-central1` (inferred)
    *   Services:
        *   `quicksend-frontend-service`
        *   `quicksend-backend-service`

## 4. Key Configurations & Environment Variables

*   **Backend `GCP_BUCKET_NAME`:**
    *   Value: `quicksend-files`
    *   Storage: Google Secret Manager, secret ID `quicksend-gcs-bucket-name`.
    *   Access: Mounted as an environment variable `GCP_BUCKET_NAME` in the `quicksend-backend-service` Cloud Run service. The backend service account has `roles/secretmanager.secretAccessor` for this secret.
*   **Frontend Firebase Configuration (Vite Environment Variables):**
    *   Variables: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
    *   Storage: Google Secret Manager, with corresponding secret IDs (e.g., `quicksend-frontend-firebase-api-key`).
    *   Access Method (Attempted): Intended to be injected into the frontend build process (`npm run build`) by Cloud Build. The `cloudbuild.yaml` currently uses `--build-arg` in the Docker build step for the frontend, and the frontend `Dockerfile` uses `ARG` and `ENV` to receive these.

## 5. Known Entities

*   GCP Project ID: `fleet-parsec-425911-i7` (inferred from service account email)
*   Cloud Build Service Account: `627959729856-compute@developer.gserviceaccount.com`
*   Backend Service Account: `quicksend-backend@fleet-parsec-425911-i7.iam.gserviceaccount.com`
*   GCS Bucket for Files: `quicksend-files`
*   Firestore Database ID: `quicksend-db`
*   Artifact Registry Region: `us-central1`
*   Cloud Run Region: `us-central1`
*   Cloud Run Frontend Service: `quicksend-frontend-service`
*   Cloud Run Backend Service: `quicksend-backend-service`
*   **Secrets in Secret Manager:**
    *   `quicksend-gcs-bucket-name`
    *   `quicksend-frontend-firebase-api-key`
    *   `quicksend-frontend-firebase-app-id`
    *   `quicksend-frontend-firebase-auth-domain`
    *   `quicksend-frontend-firebase-messaging-sender-id`
    *   `quicksend-frontend-firebase-project-id`
    *   `quicksend-frontend-firebase-storage-bucket`

## 6. Troubleshooting History & Current Status

1.  **Initial Setup:** Dockerfiles for frontend (root) and backend (`backend/`) created. `.dockerignore` files added. `package.json` scripts confirmed. Google Artifact Registry repositories (`quicksend-frontend`, `quicksend-backend`) set up.
2.  **`cloudbuild.yaml` Creation:** Initial version defined build, push, and deploy steps for both services. Backend deployment configured with its service account.
3.  **Backend GCS Bucket Name:** `GCP_BUCKET_NAME` (`quicksend-files`) was moved from direct env var in `cloudbuild.yaml` to Secret Manager (`quicksend-gcs-bucket-name`). Backend service account granted `roles/secretmanager.secretAccessor`. Backend Cloud Run service later configured to mount this secret.
4.  **Frontend TypeScript Errors (Build Time):** Unused imports removed from `src/Header.tsx`, `src/Uploader.tsx`, `src/components/files/FileCard.tsx`, and `src/pages/MyFilesPage.tsx`.
5.  **Backend TypeScript Errors (Build Time):** Test files (`**/*.test.ts`, `src/test-*.ts`) and `src/utils/cleanup.ts` added to `exclude` in `backend/tsconfig.json`.
6.  **Backend Deployment Failure ("ENOENT: no such file or directory" for service account JSON):** Modified `backend/src/config/firebase.ts` to use Application Default Credentials by removing explicit `admin.credential.cert()` and `databaseURL` from `admin.initializeApp()`.
7.  **Backend Deployment Failure ("Error: A bucket name is needed"):** User confirmed backend Cloud Run service was configured to mount the `quicksend-gcs-bucket-name` secret as the `GCP_BUCKET_NAME` environment variable.
8.  **Frontend Deployment Failure ("Default STARTUP TCP probe failed ... on port 8080"):**
    *   Nginx in frontend container was listening on port 80. Cloud Run expects port from `$PORT` (default 8080).
    *   Created `nginx.conf.template` using `${PORT}`.
    *   Updated frontend `Dockerfile` (root) to install `gettext` (for `envsubst`), copy template, `EXPOSE 8080`, and use `CMD` to run `envsubst` on template before starting Nginx. Fixed `CMD` syntax issues.
9.  **Successful Build, but Frontend Blank Page (`auth/invalid-api-key`):** Indicated Firebase config was not correctly passed to the frontend JavaScript during build.
10. **Investigation into Frontend Firebase Config:**
    *   Frontend (`src/lib/firebase.ts`) uses Vite, expects `VITE_FIREBASE_...` env vars during build.
    *   Six secrets created in Secret Manager for frontend Firebase config.
    *   Cloud Build SA (`627959729856-compute@developer.gserviceaccount.com`) confirmed to have `Secret Manager Secret Accessor` role.
    *   **Attempt 1 (`secretEnv` directly):** `cloudbuild.yaml` updated with `availableSecrets` to map secrets to `VITE_FIREBASE_...` and `secretEnv` in the "Build Frontend" step. *Result: Still `auth/invalid-api-key`.*
    *   **Debug Step:** Added a step to `cloudbuild.yaml` to print `VITE_FIREBASE_API_KEY`. Confirmed Cloud Build step itself *could* access the secret.
    *   **Local Test:** Hardcoding Firebase config in `src/lib/firebase.ts` and building/previewing locally *worked*, proving config values and frontend code are correct.
    *   **Attempt 2 (Docker `--build-arg`):**
        *   Frontend `Dockerfile` (root): Added `ARG VITE_...` for each Firebase var, then `ENV VITE_...=${VITE_...}` to set them.
        *   `cloudbuild.yaml`: "Build Frontend" step modified to pass `--build-arg VITE_...=${_VITE_...}` (using underscore-prefixed substitution variables tied to secrets). `secretEnv` was removed from this step, and `availableSecrets` used underscore prefixes for the mapping in the main `substitutions` or `availableSecrets` block.
        *   *Result: Still `auth/invalid-api-key`. Debug prints in `Dockerfile` (before `npm run build`) showed `VITE_...` env vars were empty inside Docker build.*
11. **Current State & Hypothesis (as of file retrieval for this summary):**
    *   The `cloudbuild.yaml` and frontend `Dockerfile` (root) are currently using the `--build-arg` and `ARG/ENV` method respectively.
    *   The core issue remains: `auth/invalid-api-key` in the deployed frontend.
    *   The primary hypothesis is that the `VITE_...` environment variables, although accessible to the Cloud Build *step* (as shown by debug prints of substitutions), are not being correctly passed into or recognized by the `npm run build` (Vite) process when executed *inside the Docker container* during the "Build Frontend" step in Cloud Build. This occurs despite using `--build-arg` in `cloudbuild.yaml` and `ARG`/`ENV` in the `Dockerfile`.
    *   User has confirmed Cloud Build SA permissions and is considering a support ticket.
    *   The conversation mentioned reverting from `--build-arg` to the `secretEnv` approach. The retrieved files (`cloudbuild.yaml` and `Dockerfile`) show the `--build-arg` mechanism is currently in place. This might be a point of confusion or a recent change not fully explored.

## 7. Key File Contents

### `cloudbuild.yaml` (Root)
```yaml
steps:
  # 1. Build Frontend Docker image using substitutions for Firebase config
  - name: 'gcr.io/cloud-builders/docker'
    id: 'Build Frontend'
    args: [
        'build',
        '-t',
        '${_AR_REGION}-docker.pkg.dev/$PROJECT_ID/quicksend-frontend/quicksend-frontend:$COMMIT_SHA',
        '-f',
        'Dockerfile', # Assumed to be the root Dockerfile for frontend
        # Pass trigger substitution variables as build arguments
        '--build-arg',
        'VITE_FIREBASE_API_KEY=${_VITE_FIREBASE_API_KEY}',
        '--build-arg',
        'VITE_FIREBASE_AUTH_DOMAIN=${_VITE_FIREBASE_AUTH_DOMAIN}',
        '--build-arg',
        'VITE_FIREBASE_PROJECT_ID=${_VITE_FIREBASE_PROJECT_ID}',
        '--build-arg',
        'VITE_FIREBASE_STORAGE_BUCKET=${_VITE_FIREBASE_STORAGE_BUCKET}',
        '--build-arg',
        'VITE_FIREBASE_MESSAGING_SENDER_ID=${_VITE_FIREBASE_MESSAGING_SENDER_ID}',
        '--build-arg',
        'VITE_FIREBASE_APP_ID=${_VITE_FIREBASE_APP_ID}',
        '.' # Context for frontend build is the root directory
      ]
    # availableSecrets implicitly handled by top-level substitutions if _VITE_... vars are mapped to secrets in trigger
    # No secretEnv needed here as we are using substitutions via --build-arg

  # 2. Build Backend Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: [
        'build',
        '-t',
        '${_AR_REGION}-docker.pkg.dev/$PROJECT_ID/quicksend-backend/quicksend-backend:$COMMIT_SHA',
        '-f',
        'backend/Dockerfile',
        './backend' # Context for backend build is the backend directory
      ]
    id: 'Build Backend'

  # 3. Push Frontend image to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_AR_REGION}-docker.pkg.dev/$PROJECT_ID/quicksend-frontend/quicksend-frontend:$COMMIT_SHA']
    id: 'Push Frontend'
    waitFor: ['Build Frontend']

  # 4. Push Backend image to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_AR_REGION}-docker.pkg.dev/$PROJECT_ID/quicksend-backend/quicksend-backend:$COMMIT_SHA']
    id: 'Push Backend'
    waitFor: ['Build Backend']

  # 5. Deploy Frontend to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      [
        'run', 'deploy', '${_FRONTEND_SERVICE_NAME}',
        '--image', '${_AR_REGION}-docker.pkg.dev/$PROJECT_ID/quicksend-frontend/quicksend-frontend:$COMMIT_SHA',
        '--region', '${_CLOUDRUN_REGION}',
        '--platform', 'managed',
        '--allow-unauthenticated'
      ]
    id: 'Deploy Frontend'
    waitFor: ['Push Frontend']

  # 6. Deploy Backend to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      [
        'run', 'deploy', '${_BACKEND_SERVICE_NAME}',
        '--image', '${_AR_REGION}-docker.pkg.dev/$PROJECT_ID/quicksend-backend/quicksend-backend:$COMMIT_SHA',
        '--region', '${_CLOUDRUN_REGION}',
        '--platform', 'managed',
        '--service-account', '${_BACKEND_SERVICE_ACCOUNT}',
        '--set-env-vars=NODE_ENV=production'
      ]
    id: 'Deploy Backend'
    waitFor: ['Push Backend']

images:
  - '${_AR_REGION}-docker.pkg.dev/$PROJECT_ID/quicksend-frontend/quicksend-frontend:$COMMIT_SHA'
  - '${_AR_REGION}-docker.pkg.dev/$PROJECT_ID/quicksend-backend/quicksend-backend:$COMMIT_SHA'

substitutions:
  _AR_REGION: 'us-central1'
  _CLOUDRUN_REGION: 'us-central1'
  _FRONTEND_SERVICE_NAME: 'quicksend-frontend-service'
  _BACKEND_SERVICE_NAME: 'quicksend-backend-service'
  _BACKEND_SERVICE_ACCOUNT: 'quicksend-backend@fleet-parsec-425911-i7.iam.gserviceaccount.com'
  # _VITE_FIREBASE_... substitutions are expected to be provided by the trigger
  # or mapped via availableSecrets in the trigger if these are direct secret names.
  _VITE_FIREBASE_API_KEY: 'default-key' # Placeholder if not set by trigger
  _VITE_FIREBASE_AUTH_DOMAIN: 'default-auth-domain'
  _VITE_FIREBASE_PROJECT_ID: 'default-project-id'
  _VITE_FIREBASE_STORAGE_BUCKET: 'default-storage-bucket'
  _VITE_FIREBASE_MESSAGING_SENDER_ID: 'default-sender-id'
  _VITE_FIREBASE_APP_ID: 'default-app-id'

options:
  logging: CLOUD_LOGGING_ONLY

# Example of how secrets would be made available to substitutions if not directly in trigger:
# availableSecrets:
#   secretManager:
#   - versionName: projects/$PROJECT_ID/secrets/quicksend-frontend-firebase-api-key/versions/latest
#     env: '_VITE_FIREBASE_API_KEY' # This makes the secret available as a substitution variable
#   - versionName: projects/$PROJECT_ID/secrets/quicksend-frontend-firebase-auth-domain/versions/latest
#     env: '_VITE_FIREBASE_AUTH_DOMAIN'
#   # ... and so on for other Firebase secrets
```

### `Dockerfile` (Root - Frontend)
```dockerfile
# Stage 1: Build the React application
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

# Define build arguments to receive values from Cloud Build substitutions
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

# Set build-time environment variables from ARGs for Vite
ENV VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
ENV VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}
ENV VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}
ENV VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}
ENV VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}

# For debugging: Print the env vars to see if they are set
RUN echo "VITE_FIREBASE_API_KEY in Docker build: $VITE_FIREBASE_API_KEY"
RUN echo "VITE_FIREBASE_PROJECT_ID in Docker build: $VITE_FIREBASE_PROJECT_ID"

RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:1.25-alpine

RUN apk add --no-cache gettext
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
CMD sh -c "envsubst '\$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
```

### `backend/Dockerfile`
```dockerfile
# Use an official Node.js runtime as a parent image
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD [ "npm", "start" ]
```

### `src/lib/firebase.ts` (Frontend Firebase Init)
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Vite exposes env variables through import.meta.env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
```

### `backend/src/config/firebase.ts` (Backend Firebase Admin Init)
```typescript
import * as admin from 'firebase-admin';
import env from './environments'; // Assuming this correctly sources projectId and bucketName

if (!admin.apps.length) {
  console.log('Initializing Firebase Admin SDK...');
  admin.initializeApp({
    storageBucket: env.gcpBucketName, // e.g., "quicksend-files.appspot.com" or your actual bucket name
    projectId: env.gcpProjectId, // e.g., "fleet-parsec-425911-i7"
  });
  console.log('Firebase Admin SDK Initialized.');
}

export const firestore = admin.firestore();
firestore.settings({ databaseId: 'quicksend-db' }); // Ensure this matches your Firestore DB name

export default admin;
```
Note: `backend/src/config/environments.ts` likely sources `gcpBucketName` from `process.env.GCP_BUCKET_NAME` (mounted by Cloud Run from secret) and `gcpProjectId` from ADC or another env var.

### `nginx.conf.template` (Root)
```nginx
server {
    listen ${PORT} default_server;
    listen [::]:${PORT} default_server;

    root /usr/share/nginx/html;
    index index.html index.htm;
    server_name _;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### `package.json` (Root - Frontend Scripts)
```json
{
  // ... other fields ...
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build", // This is the relevant build script
    "lint": "eslint .",
    "preview": "vite preview"
  }
  // ... other fields ...
}
```

### `backend/package.json` (Backend Scripts)
```json
{
  // ... other fields ...
  "scripts": {
    "start": "node dist/server.js", // Relevant start script
    "dev": "nodemon src/server.ts",
    "build": "tsc", // Relevant build script
    "test": "jest"
  }
  // ... other fields ...
}
```

### `backend/tsconfig.json` (Relevant `exclude` section)
```json
{
  // ... compilerOptions ...
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "**/*.test.ts",
    "src/test-*.ts",
    "src/utils/cleanup.ts"
  ]
}
``` 