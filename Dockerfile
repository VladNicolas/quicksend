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

# Build the application for production
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
# The CMD instruction uses sh -c to allow environment variable substitution
CMD ["sh", "-c", "envsubst \'$PORT\' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"] 