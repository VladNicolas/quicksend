# Stage 1: Build the React application
FROM node:18-alpine as builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# --- TEMPORARY DEBUG: Print ENV vars before build --- 
RUN echo "DEBUG (secretEnv): VITE_FIREBASE_API_KEY ends with ***$(echo -n $VITE_FIREBASE_API_KEY | tail -c 5)***" && \
    echo "DEBUG (secretEnv): VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN" && \
    echo "DEBUG (secretEnv): VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID" && \
    echo "DEBUG (secretEnv): VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET" && \
    echo "DEBUG (secretEnv): VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID" && \
    echo "DEBUG (secretEnv): VITE_FIREBASE_APP_ID starts with ***$(echo -n $VITE_FIREBASE_APP_ID | head -c 5)***"
# --- END TEMPORARY DEBUG --- 

# Build the application for production
# Vite will use VITE_* environment variables present in the build environment
RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:1.25-alpine

# Nginx needs envsubst to substitute environment variables in the config template
# Install gettext package which provides envsubst
RUN apk add --no-cache gettext

# Copy the build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the Nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Expose port 8080 - Cloud Run uses the $PORT variable (default 8080)
# Nginx will listen on this port based on the substituted config
EXPOSE 8080

# Start Nginx after substituting the port from the PORT environment variable
# Use shell form of CMD and escape $PORT for envsubst
CMD sh -c "envsubst '\$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'" 