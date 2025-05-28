# QuickSend

QuickSend is a modern file sharing application that makes sending large files as simple as dropping them into your browser. Built with React and powered by Google Cloud Platform, it handles everything from secure uploads to automatic email delivery, with files automatically expiring after 7 days for privacy.

## What it does

The application solves the common problem of sharing large files through email attachments. Instead of dealing with size limits and slow uploads, users can simply drag files into QuickSend, generate a secure sharing link, and either copy it directly or have the system automatically send it via email. The recipient gets a clean, simple download page that works on any device.

Behind the scenes, QuickSend leverages Google Cloud Storage for reliable file hosting, Firestore for managing metadata and user data, and Firebase Authentication for secure access control. The entire system runs on Cloud Run's serverless infrastructure, which means it scales automatically based on demand while keeping costs minimal during low usage periods.

## Technology choices

The frontend uses React 18 with TypeScript, providing a modern, type-safe development experience. Vite serves as the build tool for lightning-fast development cycles, while Tailwind CSS and Radix UI components ensure the interface is both beautiful and accessible. The authentication flow integrates seamlessly with Firebase, giving users familiar login options.

The backend runs on Node.js with Express, also written in TypeScript for consistency across the codebase. This creates a unified development experience where the same language and tooling work across both frontend and backend. The API follows REST principles and handles file uploads, user management, and email notifications through clean, documented endpoints.

Google Cloud Platform provides the infrastructure foundation. Cloud Run hosts both the frontend and backend as containerized services, automatically scaling based on traffic. Cloud Storage manages file uploads with built-in redundancy and global distribution. Firestore serves as the NoSQL database, storing user information and file metadata with real-time synchronization capabilities.

## Development approach

The entire application is containerized using Docker, with separate containers for frontend and backend services. This approach ensures consistent environments across development, testing, and production. Multi-stage builds optimize the final container sizes, while Docker Compose simplifies local development by orchestrating all services together.

Infrastructure as Code principles guide the deployment process. YAML configuration files define the entire cloud infrastructure, from Cloud Run services to storage buckets and database collections. This makes deployments predictable and environments reproducible, while also enabling version control of infrastructure changes.

The CI/CD pipeline runs through Google Cloud Build, automatically triggered by GitHub commits. Each push runs tests, builds Docker images, and deploys to the appropriate environment. Environment variables and secrets are managed through Google Secret Manager, keeping sensitive configuration secure while maintaining deployment automation.

## Getting started

Setting up QuickSend requires Node.js 18 or higher and Docker for containerization. The repository includes both frontend and backend code, with clear separation between concerns. After cloning, install dependencies in both directories and configure the necessary environment variables for Firebase and Google Cloud services.

Local development runs both services simultaneously - the React frontend on port 5173 and the Express backend on port 3000. Hot reloading works for both services, making the development experience smooth and responsive. The application connects to real Google Cloud services even in development, ensuring consistency with production behavior.

For production deployment, the application uses Google Cloud Platform services exclusively. Cloud Build handles the deployment pipeline, reading configuration from cloudbuild.yaml files that define build steps, test execution, and deployment targets. The serverless architecture means the application scales automatically and costs remain proportional to actual usage.

## File handling and security

File uploads go directly to Google Cloud Storage through a secure API that validates file types and sizes. The system generates unique identifiers for each file and creates time-limited sharing URLs that automatically expire after 7 days. This approach balances convenience with privacy, ensuring files don't accumulate indefinitely while giving users reasonable access time.

Authentication uses Firebase Auth, which supports multiple login methods and integrates seamlessly with Google Cloud's identity management. Users only see their own files, and all API endpoints verify authentication tokens before processing requests. The frontend maintains authentication state through React Context, providing a smooth user experience across page refreshes and navigation.

Email integration uses a reliable third-party service to send sharing notifications. When users choose to share via email, the system generates a personalized message with the download link and sends it immediately. The email includes clear information about file expiration and download instructions, making the recipient experience as smooth as possible.
