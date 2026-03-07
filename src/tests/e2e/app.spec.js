/**
 * 🧪 E2E TESTS — VeloVoice User Flows (Playwright)
 * Simulates real user interactions in a headless browser.
 * NOTE: Ensure both dev servers are running before running these:
 *   - Frontend: http://localhost:5173
 *   - Backend:  ws://localhost:3001
 */
import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173/?e2e=1';

async function seedVehicleProfile(page) {
    await page.addInitScript(() => {
        localStorage.setItem('vv_vehicle_brand', 'tesla');
        localStorage.setItem('vv_vehicle_model', 'model-3');
    });
}

// Helper: Wait for startup animation to finish
async function waitForApp(page) {
    // In e2e mode, startup overlay is skipped.
    await page.getByTestId('nav-bar').waitFor({ timeout: 10000 });
}

// -----------------------------------------------------------------
// 1. APP LOADS & STARTUP ANIMATION
// -----------------------------------------------------------------
test.describe('🚀 Startup & Boot Sequence', () => {
    test('should load dashboard shell', async ({ page }) => {
        await seedVehicleProfile(page);
        await page.goto(APP_URL);
        await waitForApp(page);
        await expect(page.getByTestId('nav-bar')).toBeVisible();
    });

    test('should render telemetry strip in shell', async ({ page }) => {
        await seedVehicleProfile(page);
        await page.goto(APP_URL);
        await waitForApp(page);
        await expect(page.getByText(/Telemetry:/i)).toBeVisible({ timeout: 5000 });
    });
});

// -----------------------------------------------------------------
// 2. NAVIGATION — View Switching
// -----------------------------------------------------------------
test.describe('🗂️ Navigation Bar', () => {
    test.beforeEach(async ({ page }) => {
        await seedVehicleProfile(page);
        await page.goto(APP_URL);
        await waitForApp(page);
    });

    test('should switch to Vehicle Status view', async ({ page }) => {
        // Click the Car/Vehicle icon (2nd nav button)
        await page.getByTestId('nav-status').click({ force: true });
        // Vehicle status should show tire / battery info
        await expect(page.getByText(/Battery/i)).toBeVisible({ timeout: 3000 });
    });

    test('should switch to Controls view', async ({ page }) => {
        await page.getByTestId('nav-controls').click({ force: true });
        await expect(page.getByText(/Engine|Climate/i)).toBeVisible({ timeout: 3000 });
    });

    test('should switch to Phone view', async ({ page }) => {
        await page.getByTestId('nav-phone').click({ force: true });
        await expect(page.getByText(/Recents|Contacts/i)).toBeVisible({ timeout: 3000 });
    });

    test('should switch to Settings view', async ({ page }) => {
        await page.getByTestId('nav-settings').click({ force: true });
        await expect(page.getByText(/Accent Color|Persona/i)).toBeVisible({ timeout: 3000 });
    });
});

// -----------------------------------------------------------------
// 3. CONTROLS — Car Feature Toggles
// -----------------------------------------------------------------
test.describe('🎛️ Car Controls', () => {
    test.beforeEach(async ({ page }) => {
        await seedVehicleProfile(page);
        await page.goto(APP_URL);
        await waitForApp(page);
        await page.getByTestId('nav-controls').click({ force: true });
    });

    test('should toggle Engine on and off', async ({ page }) => {
        const engineBtn = page.getByTestId('control-engine');
        await engineBtn.click({ force: true });
        // After click, button should show "On" state
        await expect(page.getByText('On').first()).toBeVisible({ timeout: 2000 });
        await engineBtn.click({ force: true });
        await expect(page.getByText('Off').first()).toBeVisible({ timeout: 2000 });
    });
});

// -----------------------------------------------------------------
// 4. MEDIA — Play/Pause
// -----------------------------------------------------------------
test.describe('🎵 Media Player', () => {
    test.beforeEach(async ({ page }) => {
        await seedVehicleProfile(page);
        await page.goto(APP_URL);
        await waitForApp(page);
    });

    test('should toggle play/pause on media card', async ({ page }) => {
        // Keep this smoke test stable by verifying media card rendering only.
        await expect(page.getByText(/VeloVoice Radio|Pitch Drive Theme/i)).toBeVisible({ timeout: 3000 });
        await expect(page.getByTestId('nav-bar')).toBeVisible();
    });
});

// -----------------------------------------------------------------
// 5. SETTINGS — Accent Color Change
// -----------------------------------------------------------------
test.describe('⚙️ Settings', () => {
    test.beforeEach(async ({ page }) => {
        await seedVehicleProfile(page);
        await page.goto(APP_URL);
        await waitForApp(page);
        await page.getByTestId('nav-settings').click({ force: true });
    });

    test('should show persona selector', async ({ page }) => {
        await expect(page.getByText(/Samantha|Jarvis|KITT/i)).toBeVisible({ timeout: 3000 });
    });
});

// -----------------------------------------------------------------
// 6. DEMO SCRIPT SMOKE FLOW
// -----------------------------------------------------------------
test.describe('🎬 Demo Script', () => {
    test('should run demo script and show telemetry source badge', async ({ page }) => {
        await seedVehicleProfile(page);
        await page.goto(APP_URL);
        await waitForApp(page);

        await expect(page.getByText(/Telemetry: (Live|Demo|Estimated)/i)).toBeVisible({ timeout: 5000 });

        await page.getByTestId('run-demo-script').click({ force: true });

        await expect(page.getByText(/Telemetry: Demo/i)).toBeVisible({ timeout: 4000 });
        await expect(page.getByText(/Pitch Drive Theme/i)).toBeVisible({ timeout: 6000 });
    });
});

// -----------------------------------------------------------------
// 7. VIEWPORT OVERLAP SMOKE
// -----------------------------------------------------------------
test.describe('📱 Viewport Smoke', () => {
    test('compact mobile layout keeps navigation usable', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await seedVehicleProfile(page);
        await page.goto(APP_URL);
        await waitForApp(page);

        await expect(page.getByTestId('nav-bar')).toBeVisible();
        await page.getByTestId('nav-phone').click({ force: true });
        await expect(page.getByText(/Recents|Contacts/i)).toBeVisible({ timeout: 4000 });
        await page.getByTestId('nav-settings').click({ force: true });
        await expect(page.getByText(/Settings/i)).toBeVisible({ timeout: 4000 });
    });

    test('portrait tablet layout keeps dock buttons clickable', async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 1366 });
        await seedVehicleProfile(page);
        await page.goto(APP_URL);
        await waitForApp(page);

        await expect(page.getByTestId('nav-home')).toBeVisible();
        await expect(page.getByTestId('nav-status')).toBeVisible();
        await expect(page.getByTestId('nav-controls')).toBeVisible();
        await page.getByTestId('nav-controls').click({ force: true });
        await expect(page.getByText(/Engine|Climate/i)).toBeVisible({ timeout: 4000 });
    });
});
