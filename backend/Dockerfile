# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
# Use wildcard to copy both package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
# Use --only=production if you don't need devDependencies
# Or simply 'npm install' if you need devDependencies for the build step
RUN npm install

# Bundle app source
COPY . .

# Build TypeScript code (if applicable)
# If your 'build' script compiles TS to JS (e.g., into a 'dist' folder)
# Ensure your tsconfig.json is configured correctly for production builds
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Define the command to run the application
# This assumes 'npm start' is defined in your package.json
# and executes the compiled JavaScript entry point (e.g., node dist/server.js)
CMD [ "npm", "start" ] 