'use strict';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  const token  = process.env.NETLIFY_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!token || !siteId) {
    return {
      statusCode: 503,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'NETLIFY_TOKEN or NETLIFY_SITE_ID not configured' }),
    };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    // Step 1: get accounts to find account slug
    const accountsRes = await fetch('https://api.netlify.com/api/v1/accounts', { headers });
    const accounts = await accountsRes.json();
    const accountSlug = accounts?.[0]?.slug ?? null;

    // Step 2: get billing usage for function invocations (current billing period)
    let invocations = 0;
    let usageData = null;

    if (accountSlug) {
      const usageRes = await fetch(
        `https://api.netlify.com/api/v1/accounts/${accountSlug}/billing/usage`,
        { headers }
      );
      usageData = await usageRes.json();
      // Functions usage is typically under 'functions_invocations' or 'functions'
      invocations =
        usageData?.functions_invocations?.used ??
        usageData?.functions?.invocations?.used ??
        usageData?.functions?.used ??
        0;
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ invocations, accountSlug, usageData }),
    };
  } catch (err) {
    console.error('getNetlifyUsage error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal error', detail: err.message }),
    };
  }
};
