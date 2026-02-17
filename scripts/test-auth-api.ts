/**
 * Test script for Feature #13: Filings API requires authentication
 *
 * Tests:
 * 1. GET /api/edgar/filings with no session cookie returns 401
 * 2. GET /api/edgar/filings with valid session returns 200 (via signup+signin flow)
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3006";

async function testUnauthenticatedRequest(): Promise<boolean> {
  console.log("\n📋 Test 1: Unauthenticated request to /api/edgar/filings");

  const response = await fetch(`${BASE_URL}/api/edgar/filings`);
  const status = response.status;

  console.log(`   Response status: ${status}`);

  if (status === 401) {
    console.log("   ✅ PASS: Returns 401 Unauthorized");
    return true;
  } else if (status === 403) {
    console.log("   ✅ PASS: Returns 403 Forbidden (acceptable alternative)");
    return true;
  } else {
    console.log(`   ❌ FAIL: Expected 401 or 403, got ${status}`);
    try {
      const body = await response.text();
      console.log(`   Response body: ${body.substring(0, 200)}`);
    } catch {
      // Ignore
    }
    return false;
  }
}

async function testAuthenticatedRequest(): Promise<boolean> {
  console.log("\n📋 Test 2: Authenticated request to /api/edgar/filings");

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";

  try {
    // Step 1: Sign up a new user
    console.log(`   Creating test user: ${testEmail}`);
    const signUpResponse = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: "Test User",
      }),
    });

    if (!signUpResponse.ok) {
      const signUpBody = await signUpResponse.text();
      console.log(`   Sign up failed: ${signUpResponse.status}`);
      console.log(`   Response: ${signUpBody.substring(0, 200)}`);
      return false;
    }

    // Get the session cookie from the response
    const setCookieHeader = signUpResponse.headers.get("set-cookie");
    console.log(`   Sign up successful, got cookie: ${setCookieHeader ? "yes" : "no"}`);

    // Better Auth may return user data in response
    let sessionCookie = setCookieHeader;

    // Step 2: Sign in to get a valid session
    console.log(`   Signing in...`);
    const signInResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const signInCookie = signInResponse.headers.get("set-cookie");
    console.log(`   Sign in response: ${signInResponse.status}`);
    console.log(`   Sign in cookie: ${signInCookie ? "received" : "not received"}`);

    // Use the most recent cookie
    const activeCookie = signInCookie || sessionCookie;

    if (!activeCookie) {
      console.log("   ❌ FAIL: No session cookie received from auth flow");
      return false;
    }

    // Step 3: Make authenticated request to filings API
    console.log(`   Making authenticated request to /api/edgar/filings...`);
    const filingsResponse = await fetch(`${BASE_URL}/api/edgar/filings`, {
      headers: {
        Cookie: activeCookie,
      },
    });

    const status = filingsResponse.status;
    console.log(`   Response status: ${status}`);

    if (status === 200) {
      console.log("   ✅ PASS: Returns 200 OK");

      // Verify response structure
      const body = await filingsResponse.json();
      if (body.filings && body.pagination) {
        console.log(`   Response includes ${body.filings.length} filings`);
        console.log(`   Pagination: page ${body.pagination.page}, total ${body.pagination.total}`);
      } else {
        console.log("   ⚠️ WARNING: Response structure unexpected");
        console.log(`   Keys: ${Object.keys(body).join(", ")}`);
      }
      return true;
    } else {
      console.log(`   ❌ FAIL: Expected 200, got ${status}`);
      try {
        const body = await filingsResponse.text();
        console.log(`   Response body: ${body.substring(0, 200)}`);
      } catch {
        // Ignore
      }
      return false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: Error during test`);
    console.log(`   Error: ${error}`);
    return false;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("Feature #13: Filings API requires authentication");
  console.log("=".repeat(60));

  const test1 = await testUnauthenticatedRequest();
  const test2 = await testAuthenticatedRequest();

  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log("=".repeat(60));
  console.log(`Test 1 (Unauthenticated -> 401): ${test1 ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Test 2 (Authenticated -> 200):   ${test2 ? "✅ PASS" : "❌ FAIL"}`);

  if (test1 && test2) {
    console.log("\n🎉 All tests passed! Feature #13 is complete.");
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed. Feature #13 needs more work.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
