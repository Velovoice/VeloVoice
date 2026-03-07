import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './src/tests/e2e',
    timeout: 30000,
    expect: { timeout: 5000 },
    fullyParallel: true,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Start frontend + backend dev servers automatically before E2E tests.
    webServer: [
        {
            command: 'npm run dev --prefix backend',
            url: 'http://localhost:3001/health',
            reuseExistingServer: true,
            timeout: 30000,
        },
        {
            command: 'npm run dev',
            url: 'http://localhost:5173',
            reuseExistingServer: true,
            timeout: 30000,
        }
    ],
});
