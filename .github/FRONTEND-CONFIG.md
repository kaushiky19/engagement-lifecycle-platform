# GitHub Actions frontend configuration

For production, the frontend build needs these values available at build time:

VITE_API_URL
VITE_ENABLE_DEMO_MODE
VITE_ENTRA_CLIENT_ID
VITE_ENTRA_TENANT_ID
VITE_ENTRA_API_SCOPE

You can store non-secret values as GitHub Actions Variables and sensitive values as GitHub Actions Secrets. 
The sample workflow currently expects the Static Web Apps deployment flow; configure the values in the workflow/environment before disabling demo mode.
